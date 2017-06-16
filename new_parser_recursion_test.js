var p = require('./new_parser.js')
var print = console.log

// Rule class
var Rule = p.Rule

// basic rules
var empty = p.empty // match nothing, return true
var eos = p.eos // end of string
var numeric = p.numeric
var alpha = p.alpha
var whitespace = p.whitespace
var any = p.any // match anything, unless eos

// recursively apply rules
var ref = p.ref

// rule builder
var within = p.within, notwithin = p.notwithin
var match = p.match, scr = p.scr

// emitter generator: generate xml tags
var emgen = p.emgen

// insiginifcant whitespace
var iw = whitespace.repeat().emit().or(empty)

var trim = whitespace.or(match('\n'))
.repeat().emit().or(empty)

var number =
numeric
.and(numeric.repeat())
.emit(emgen('number'))

// refer to rule 'list' which hasn't been defined yet
var _list = ref(r=>list)

var notnewline = notwithin('\n')
var newline = within('\n').emit()

var linebreak = iw
.and(
  match('#')
  .emit()
  .and(notnewline.repeat())
  .emit(emgen('comment'))
  .or(empty)
  .and(newline)
)

var element = number.or(_list).or(linebreak)

var list = trim
.and(match('[').emit())
.and(trim.and(element).and(trim).repeat())
.and(match(']').emit())
.and(trim)
.emit(emgen('list'))

var prog =
`#yeah
[ 312
  525 3 [3 8[9 #shit


    #bitch
  ]] ]
  `
  print(prog)
  print(list.parse(prog))
