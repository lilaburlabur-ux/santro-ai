# SEO audit

pages: **183** · engine: seo_audit.py (title/desc/canonical/H1/schema, count guards, landing split guard) — **PASSED**

- pages with h1!=1 or missing canonical/description: **8**
- duplicate title clusters: **0** 
- duplicate description clusters: **0**
- noindexed (intentional): ['c.html', 'dashboard.html', 'ds-v2/gallery.html', 'e.html', 'ipo.html', 'signin.html', 'signup.html', 't.html']

|file|h1|canonical|desc|
|---|---|---|---|
|c.html|2|False|True|
|dashboard.html|0|True|True|
|ds-v2/gallery.html|1|False|False|
|e.html|2|False|True|
|ipo.html|2|False|True|
|signin.html|0|True|True|
|signup.html|0|True|True|
|t.html|2|False|True|