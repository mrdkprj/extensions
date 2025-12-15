import time
import re
import traceback
import json

ALL_URLS = "*"
INVALID_CHARS = r"<|>|\:|\"|\/|\\|\||\?|\*"
CSS_DIR = "./extension/css/"

SEPARATOR = "##"
SELECTOR_PREFIX = [".", "#"]
IGNORE_SYMBOL = ["#?#", "#@#", "#$#"]
GEN_HIDE = "generichide"

def create_domain_rule(rules, domain, css):

    if domain == ALL_URLS:
        create_general(rules, css)
        return

    if not domain in rules:
        rules[domain] = {
            "generichide": False,
            "css": []
        }

    if css == GEN_HIDE:
        rules[domain][GEN_HIDE] = True
        return

    rules[domain]["css"].append(css)

def create_general(rules, css):

    if css[0] in SELECTOR_PREFIX:
        key = css[1]
    else:
        key = css[0]

    if not ALL_URLS in rules:
        rules[ALL_URLS] = {}

    if key in rules[ALL_URLS]:
        rules[ALL_URLS][key].append(css)
    else:
        rules[ALL_URLS][key] = [css]

def ignore(line):
    if "genericblock" in line:
        return True

    if any(s in line for s in IGNORE_SYMBOL):
        return True

    return False

#domain:[genhide:boolean,css:string]
#domain$genhide,domain

# order by ||,alptha
# if || type startswith
# else
def break_genhide(line):

    domains = []

    line = line.replace("@@","").replace("$","")

    if not line.startswith(GEN_HIDE):
        if line.startswith("||"):
            line = line.replace("||", "")
        else:
            line = ".*" + line

        if "^" in line:
            line = re.sub(r"\^", r"(\/\/|\/|\?|\=|\&)", line)

        genindex = line.index(GEN_HIDE)

        if genindex > 0:
            line = line[:genindex]

        domains.append(line + ".*")

    if "domain=" in line:
        domains = domains + line[line.index("domain=") + 7:].split("|")

    return domains

def split_per_domain(lines):

    lines.sort(key=str.lower)

    rules = {}

    #script_file = open("genhide.txt", "a+")

    for line in lines:

        try:

            if ignore(line):
                continue

            line = line.replace("\n","")
            if line.startswith(SEPARATOR):
                create_domain_rule(rules, ALL_URLS, line.replace(SEPARATOR, ""))

            elif line.startswith("@@") and GEN_HIDE in line:
                #script_file.write(line+"\n")
                #domains = break_genhide(line)
                #for domain in domains:
                #    create_domain_rule(rules, domain, GEN_HIDE)
                continue
            else:
                separator_index = line.index(SEPARATOR)
                domain_line = line[:separator_index]
                css = line[separator_index+2:]
                domains = domain_line.split(",")
                for domain in domains:
                    create_domain_rule(rules, domain, css)

        except Exception as err:
            print(line)
            print(traceback.format_exc())
            break

    return rules

def create_css(lines):
    rules = split_per_domain(lines)

    generic_css = ""
    generic_rule = rules.pop(ALL_URLS)

    for group in generic_rule.values():
        generic_css += f"{','.join(group)} {{display:none !important;}}\n\n"

    open(f"./extension/css/all_urls.css", "w").write(generic_css)

    for domain in rules:
        if len(rules[domain]["css"]) > 0:
            rules[domain]["css"] = f"{','.join(rules[domain]['css'])} {{display:none !important;}}"
        else:
            rules[domain]["css"] = ""

    open("./extension/version.txt", "w").write(str(time.time()))
    open("./extension/css.json", "w").write(json.dumps(rules))

direct = False

if direct:
    #reader = open("./test/testlist.txt", "r", encoding="utf-8")
    reader = open("easylist.txt", "r", encoding="utf-8")
    rules = []

    for line in reader.readlines():
        if line and "##" in line:
            if not line.startswith("##"):
                rules.append(line)

    #create_css(rules)
    open("./test/ubgen.txt", "w").writelines(rules)
