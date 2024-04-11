/*
www.youtube.com##+js(trusted-replace-xhr-response, /"adPlacements.*?([A-Z]"\}|"\}{2})\}\]\,/, , /playlist\?list=|player\?|watch\?v=|youtubei\/v1\/player/)
www.youtube.com##+js(trusted-replace-xhr-response, /"adPlacements.*?("adSlots"|"adBreakHeartbeatParams")/gms, $1, youtubei/v1/player)
www.youtube.com##+js(trusted-replace-fetch-response, /"adPlacements.*?([A-Z]"\}|"\}{2})\}\]\,/, , player?)
www.youtube.com##+js(trusted-replace-fetch-response, /\"adSlots.*?\}\]\}\}\]\,/, , player?)

www.youtube.com##+js(trusted-replace-xhr-response, /"adPlacements.*?([A-Z]"\}|"\}{2\,4})\}\]\,/, , /playlist\?list=|player\?|watch\?v=|youtubei\/v1\/player/)
www.youtube.com##+js(trusted-replace-xhr-response, /"adPlacements.*?("adSlots"|"adBreakHeartbeatParams")/gms, $1, youtubei/v1/player)
www.youtube.com##+js(trusted-replace-fetch-response, /"adPlacements.*?([A-Z]"\}|"\}{2\,4})\}\]\,/, , player?)
www.youtube.com##+js(trusted-replace-fetch-response, /\"adSlots.*?\}\]\}\}\]\,/, , player?)
*/
const xhrRules = [
    {url:`playlist\?list=|player\?|watch\?v=|youtubei\/v1\/player`, pattern:`"adPlacements.*?([A-Z]"\}|"\}{2\,4})\}\]\,`, replacement:""},
    {url:`youtubei/v1/player`, pattern:`"adPlacements.*?("adSlots"|"adBreakHeartbeatParams")/gms`, replacement:"$1"},
];

const fetchTargetUrls = [
    "player?"
];

const { fetch: originalFetch} = window;

const applyFetchRules = (res) => {
    let data = res.replace(/"adPlacements.*?([A-Z]"\}|"\}{2\,4})\}\]\,/, "").replace(/\"adSlots.*?\}\]\}\}\]\,/, "")
    return data;
};

window.fetch = async (...args) => {

    const [resource, config ] = args;

    // in case Request remains
    let req;
    if(resource instanceof Request){
        try{
            req = resource.clone();
        }catch(ex){
            console.log(ex)
        }
    }

    let response = await originalFetch(resource, config);

    if(req && fetchTargetUrls.some(v => req.url.includes(v))){
        console.log(req.url)
        const r = await response.clone().text();
        const jsonData = applyFetchRules(r);

        response = new Response(jsonData, response);
    }

    return response;

};

/*
* xhr
*/

const applyXhrRules = (response) => {
    const data = JSON.stringify(response);
    xhrRules.forEach(rule => {
        data = data.replace(new RegExp(rule.pattern), rule.replacement)
    })
    return JSON.parse(data);
}

const matchObjectProperties = (xhrDetails) => {
    return xhrRules.some(rule => xhrDetails.url.match(rule.url))
}

function blockXHR(){
    const self = globalThis;
    const safe = self.XMLHttpReques;
    const xhrInstances = new WeakMap();
    self.XMLHttpRequest = class extends self.XMLHttpRequest {
        open(method, url, ...args) {
            const xhrDetails = { method, url };
            let outcome = "match";

            if ( matchObjectProperties(xhrDetails) === false ) {
                outcome = "nomatch";
            }

            if ( outcome === "match" ) {
                xhrInstances.set(this, xhrDetails);
            }

            return super.open(method, url, ...args);
        }
        get response() {
            const innerResponse = super.response;
            const xhrDetails = xhrInstances.get(this);
            if ( xhrDetails === undefined ) {
                return innerResponse;
            }
            const responseLength = typeof innerResponse === "string"
                ? innerResponse.length
                : undefined;
            if ( xhrDetails.lastResponseLength !== responseLength ) {
                xhrDetails.response = undefined;
                xhrDetails.lastResponseLength = responseLength;
            }
            if ( xhrDetails.response !== undefined ) {
                return xhrDetails.response;
            }

            let objBefore;
            if ( typeof innerResponse === "object" ) {
                objBefore = innerResponse;
            } else if ( typeof innerResponse === "string" ) {
                try { objBefore = safe.JSON_parse(innerResponse); }
                catch(ex) { }
            }
            if ( typeof objBefore !== "object" ) {
                return (xhrDetails.response = innerResponse);
            }

            const objAfter = applyXhrRules(
                objBefore
            );

            let outerResponse;
            if ( typeof objAfter === "object" ) {
                outerResponse = typeof innerResponse === "string"
                    ? safe.JSON_stringify(objAfter)
                    : objAfter;
            } else {
                outerResponse = innerResponse;
            }
            return (xhrDetails.response = outerResponse);
        }
        get responseText() {
            const response = this.response;
            return typeof response !== "string"
                ? super.responseText
                : response;
        }
    };
};

blockXHR();

/*
* object
*/
Object.defineProperties(window, {

    _ytInitialPlayerResponse: {
        value: undefined,
        writable: true
    },

    _playerResponse:{
        value:undefined,
        writable:true,
    },

    ytInitialPlayerResponse: {
        get: function(){
            return this._ytInitialPlayerResponse;
        },
        set: function(val) {
            if(val){

                if(val.adPlacements) {val.adPlacements = undefined}
                //if(val.playerAds) {val.playerAds = undefined}
                //if(val.adSlots) {val.adSlots = undefined}

            }

            this._ytInitialPlayerResponse = val;
        }
    },

    playerResponse:{
        get: function(){
            return this._playerResponse;
        },
        set: function(val) {
            if(val){

                if(val.adPlacements) {val.adPlacements = undefined}

            }
            this._playerResponse = val;
        }
    },
})
