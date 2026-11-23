import re,sys,glob
v=sys.argv[1]
for f in glob.glob("js/**/*.js",recursive=True)+["index.html"]:
    s=open(f).read();o=s
    s=re.sub(r'(from\s+"[^"]+?\.m?js)(\?v=\w+)?"',lambda m:f'{m.group(1)}?v={v}"',s) if f.endswith(".js") else s
    s=re.sub(r'(new URL\("\./matting\.worker\.js)(\?v=\w+)?"',lambda m:f'{m.group(1)}?v={v}"',s)
    if f=="index.html":s=re.sub(r'\?v=\w+"',f'?v={v}"',s)
    if s!=o:open(f,"w").write(s)
