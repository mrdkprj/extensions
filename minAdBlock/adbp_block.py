import json
import re
import traceback
from css import create_css

OPTION_SYMBOL = "$"
CSS_SEPARATORS = ["##","#?#","#@#","#$#"]
INVERSE_SYMBOL = "~"
EXCLUDE_TYPES = ["popup", "csp"]
HIDE_EXCEPTS = ["elemhide","generichide"]
FIRST_PARTY = "firstParty"
THIRD_PARTH = "thirdParty"
TYPE_DICT = {
    "document":"main_frame",
    "subdocument":"sub_frame",
    "stylesheet":"stylesheet",
    "ping":"ping",
    "script":"script",
    "image":"image",
    "font":"font",
    "object":"object",
    "xmlhttprequest":"xmlhttprequest",
    "media":"media",
    "websocket":"websocket",
    "webrtc":"webtransport",
    "other":"other"
}

def ignore(line):

    if not line:
        return True

    if line.startswith("!") or line.startswith("["):
        return True

    if "popup" in line:
        return True

    return False

def format_line(raw):
    url_part = ""
    option_part = ""
    rule_info = {
        "is_exception": True if raw.startswith("@@") else False,
        "is_csp": True if "$csp" in raw or "csp=" in raw else False
    }

    line = re.sub(r"^(@@)|(\n|\r|\r\n)$", "", raw)

    if OPTION_SYMBOL in line:
        url_part = line[:line.rfind(OPTION_SYMBOL)]
        option_part = line[line.rfind(OPTION_SYMBOL) + 1:]
    else:
        url_part = line

    return {
        "url_part":url_part,
        "option_part":option_part,
        "rule_info": rule_info
    }

def is_css(line):

    if line.startswith("##"):
        return True

    for separator in CSS_SEPARATORS:
        if separator in line:
            return True

    return False

def is_hide_exception_rule(parts):

    if not parts["option_part"]:
        return False

    for option in parts["option_part"].split(","):
        if option in HIDE_EXCEPTS:
            return True

    return False

def is_regex(parts):
    if not parts["url_part"]:
        return False

    return parts["url_part"].startswith("/") and parts["url_part"].endswith("/")

def create_type_rule(types):

    resourceTypes = []
    excludedResourceTypes = []
    type_rule = {}

    for raw_type in types:

        is_inverse = raw_type.startswith(INVERSE_SYMBOL)
        type = raw_type.replace(INVERSE_SYMBOL,"")

        if type in EXCLUDE_TYPES:
            continue

        if type == "third-party":
            if is_inverse:
                type_rule["domainType"] = FIRST_PARTY
            else:
                type_rule["domainType"] = THIRD_PARTH

            continue

        if is_inverse:
            excludedResourceTypes.append(TYPE_DICT[type])
        else:
            resourceTypes.append(TYPE_DICT[type])

    if len(resourceTypes) > 0:
        type_rule["resourceTypes"] = resourceTypes

    if len(excludedResourceTypes) > 0:
        type_rule["excludedResourceTypes"] = excludedResourceTypes

    return type_rule

def create_domain_rule(domains):

    initiatorDomains = []
    excludedInitiatorDomains = []
    domain_rule = {}

    for domain in domains.split("|"):

        if domain.startswith(INVERSE_SYMBOL):
            excludedInitiatorDomains.append(domain.replace(INVERSE_SYMBOL,""))
        else:
            initiatorDomains.append(domain)

    if len(initiatorDomains) > 0:
        domain_rule["initiatorDomains"] = initiatorDomains

    if len(excludedInitiatorDomains) > 0:
        domain_rule["excludedInitiatorDomains"] = excludedInitiatorDomains

    return domain_rule

def create_options(line):
    options = {}
    types = []
    csp = ""

    for option in line.split(","):
        if option.startswith("domain="):
            domain_index = option.index("domain=")
            options.update(create_domain_rule(option[domain_index + 7:]))
        elif option.startswith("csp="):
            csp_index = option.index("csp=")
            csp = option[csp_index + 4:]
        else:
            types.append(option)

    options.update({"csp":csp})

    if len(types) > 0:
        options.update(create_type_rule(types))

    return options

def create_rule_base(rule_id, rule_info):

    rule_id+=1

    if rule_info["is_exception"]:
        return {
            "id": rule_id,
            "priority": 2,
            "action" : { "type" : "allow" }
        }

    if rule_info["is_csp"]:
        return {
            "id": rule_id,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "responseHeaders": [
                    {
                       "header": "Content-Security-Policy",
                        "operation": "append",
                        "value": ""
                    }
                ]
            }
        }

    return {
            "id": rule_id,
            "priority": 1,
            "action" : { "type" : "block" },
    }

rule_id = 0

#reader = open("./test/testlist.txt", "r", encoding="utf-8")
reader = open("easylist.txt", "r", encoding="utf-8")

rules = []
css_rules = []

for line in reader.readlines():

    if ignore(line):
        continue

    if is_css(line):
        css_rules.append(line)
        continue

    parts = format_line(line);

    if is_regex(parts):
        continue

    if parts["rule_info"]["is_exception"] and is_hide_exception_rule(parts):
        css_rules.append(line)
        continue

    rule_id+=1
    condition = {}

    rule = create_rule_base(rule_id, parts["rule_info"])

    try:
        if parts["option_part"]:
            options = create_options(parts["option_part"])
            csp = options.pop("csp")
            if csp:
                rule["action"]["responseHeaders"][0]["value"] = csp
            condition.update(options)

        if parts["url_part"]:
            condition.update({"urlFilter":parts["url_part"]})

        rule.update({"condition":condition})

        rules.append(rule)

    except Exception as err:
        print(line)
        print(parts)
        print(traceback.format_exc())
        break

#open("./test/test_result.json", "w").write(json.dumps(rules, indent=4))
open("./extension/rules.json", "w").write(json.dumps(rules, separators=(',', ':')))

if len(css_rules) > 0:
    create_css(css_rules)
