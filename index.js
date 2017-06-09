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

defun abs2 (x
  cond
    (> x 0) x
    t (- 0 x

defun show-squares (start end
  do
    (i start (+ i 1
    (> i end) (quote (done
    format t '~A ~A~%' i (* i i

show-squares 2 5
`
input.value = example.trim()

function translate(){
  var program = input.value

  var lot = psm.parse(program)

  var list = psm.listify(lot)
  json.value = JSON.stringify(list,null,4)
  lisp.value = lot.map(n=>psm.explain(n)).join('').trim()
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
