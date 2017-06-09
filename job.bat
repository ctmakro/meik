cd .
call browserify index.js -o bundle.js
copy bundle.js bundle.ts
call tsc bundle.ts
call minify bundle.js
