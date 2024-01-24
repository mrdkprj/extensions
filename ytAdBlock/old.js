function replaceFetchResponseFn(){
    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            const fetchPromise = Reflect.apply(target, thisArg, args);
            let outcome = "match";
            let url;
            const objs = [ args[0] instanceof Object ? args[0] : { url: args[0] } ];
            if ( objs[0] instanceof Request ) {
                try { objs[0] = globalThis.Request.prototype.clone.call(objs[0]);}
                catch(ex) {
                    //console.log(ex);
                }
            }
            url = objs[0].url

            if ( urls.some(v => url.includes(v)) === false ) {
                outcome = "nomatch";
            }

            if ( outcome === "nomatch" ) { return fetchPromise; }
            return fetchPromise.then(responseBefore => {
                console.log(url)
                const response = responseBefore.clone();
                return response.text().then(textBefore => {
                    const textAfter = textBefore.replace(/"adPlacements.*?([A-Z]"\}|"\}{2})\}\],/, "");
                    const outcome = textAfter !== textBefore ? "match" : "nomatch";
                    if ( outcome === "nomatch" ) { return responseBefore; }
                    const responseAfter = new Response(textAfter, {
                        status: responseBefore.status,
                        statusText: responseBefore.statusText,
                        headers: responseBefore.headers,
                    });
                    Object.defineProperties(responseAfter, {
                        ok: { value: responseBefore.ok },
                        redirected: { value: responseBefore.redirected },
                        type: { value: responseBefore.type },
                        url: { value: responseBefore.url },
                    });
                    return responseAfter;
                }).catch(reason => {
                    log("replace-fetch-response:", reason);
                    return responseBefore;
                });
            }).catch(reason => {
                log("replace-fetch-response:", reason);
                return fetchPromise;
            });
        }
    });
}

replaceFetchResponseFn();


const adPaths = [
    "[].playerResponse.adPlacements",
    "[].playerResponse.playerAds",
    "playerResponse.adPlacements",
    "playerResponse.playerAds",
    "adPlacements",
    "playerAds"
]

const deleteAds = (target, paths) => {

    if(paths[0] === "[]" && Array.isArray(target)){
        target.forEach(data => deleteAds(data))
    }

    const prop = paths.shift()

    if(!target.hasOwnProperty(prop)) return

    if(paths.length > 0){
        deleteAds(target[prop], paths)
    }else{
        delete target[prop];
    }

}

const clean = (data) => {

    adPaths.forEach(path => {
        deleteAds(data, path.split(","))
    })

    return data;
};

JSON.parse = new Proxy(JSON.parse, {
    apply: function() {
        return clean(Reflect.apply(...arguments));
    },
});

Response.prototype.json = new Proxy(Response.prototype.json, {
    apply: function() {
        return Reflect.apply(...arguments).then(data => clean(data));
    },
});