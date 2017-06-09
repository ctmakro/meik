var psm = require('./parser.js')
var print = console.log
var geid = i=>document.getElementById(i)

var input = geid('input')
var json = geid('json')
var lisp = geid('lisp')

var example =
`
print 42
print
  + 2
    * 10 4

+
  * 4 3
  * 15 2

+ (* 4 3)(* 15 2

defun max2 (a b
  cond
    (> a b) a
    t b

max2 42 21

defun our-abs (x
  cond
    (> x 0) x
    t (- 0 x
our-abs -10

defun show-squares (start end
  do
    (i start (+ i 1
    (> i end) (quote (done
    format t '~A ~A~%' i (* i i

show-squares 2 5

defun fib (n
  cond
    (< n 2) 1
    t (+ (fib (- n 1 )) (fib (- n 2

print (fib 20
`
input.value = example.trim()

function translate(){
  var program = input.value

  var lot = psm.parse(program)

  var list = psm.listify(lot)
  json.value = '/* JSON */\n'+list.map(l=>JSON.stringify(l)).join('\n\n').trim()
  lisp.value = '(); Generated from right\n'
  +lot.map(n=>psm.explain(n)).join('').trim()
}

function trytranslate(){
  try{
    translate()
  }catch(e){
    json.value = e.toString()
    console.error(e);
    throw e
  }
}

input.addEventListener('input', function() {
  trytranslate()
  // event handling code for sane browsers
}, false);

trytranslate()
