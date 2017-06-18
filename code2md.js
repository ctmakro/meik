// include
var r = require('./second_parser.js')

// rule & node class
var Rule = r.Rule,
node = r.node,

// rule generators
cr = r.cr,
eq = r.eq,
match = r.match,
within = r.within,
not_within = r.not_within,

// default rules
empty = r.empty,
eos = r.eos,
sos = r.sos,

// rule reference
ref = r.ref

var inp =
`
// comment
function yeah(){
  console.log('hello world!')
}

///md
# markdown

some text here...

- what ever! //

///

`
var iw = eq(' ').zeromore().emit()
var inl = eq('\n').zeromore().emit()
var iii = eq(' ').or(eq('\n')).zeromore().emit()
var free = x => iii.then(x).then(iii)

var alpha = cr(c=>'a'<=c&&c<='z')
var newline = eq('\n')
var alps = alpha.onemore()
var any = cr(c=>c!=='(eos)'&&c!=='(sos)'&&c!=='n/a')

var anytill = r => any.then(r.not().then(any).zeromore())

var starter = match('///').emit().then(alps).then(newline.emit()).group('head')
var ender = match('\n///\n').emit()
var content = anytill(starter.or(ender)).group('body')

var block = starter.then(content).group('block')

var code = anytill(starter).group('code')
var bt =
`
shit
///bitch

hello!

///js
shit`

starter.parse('///bitch\n')
content.parse('asnf//fsdfaf\n')

block = free(block)

var notebook = block.or(code).zeromore()
notebook.parse('asdfasfa///js\nsfsrfsfaf\n///js\nshit')
notebook.parse(bt)
