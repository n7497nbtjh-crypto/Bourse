import os, zipfile
S = "cf/site"; Z = "repere-site.zip"
with zipfile.ZipFile(Z, "w", zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(S):
        for f in fs:
            if f.startswith("."): continue
            p = os.path.join(d, f); z.write(p, os.path.relpath(p, S))
print(Z, os.path.getsize(Z) // 1024, "Ko")
