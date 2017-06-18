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

//---------------------

// 1. matching

// 1a. character rules: match single character by lambda
var decimal = cr(c => '0'<=c&&c<='9')
decimal.parse('9')

// 1b. character rules: match single character by equivalence
var whitespace = cr(c => c==' ')
var whitespace = eq(' ') // equivalent of above
whitespace.parse(' ')

// 1c. character rules: match single character by multiple equivalence
var hexademical = cr(c => '0123456789abcdefABCDEF'.indexOf(c)>=0)
var hexademical = within('0123456789abcdefABCDEF') // equivalent of above
hexademical.parse('f')

// 1d. match entire string
//var china = eq('c').then(eq('h')) ... // too verbose
var homeland = match('china')
homeland.parse('china')

// 2. repetition

// 2a. greedy repetition
var decimal_string = decimal.onemore()  // match one or more, greedily
decimal_string.parse('415')             // success
// decimal_string.parse('')             // ERROR
var decimal_string = decimal.zeromore() // match zero or more, greedily
decimal_string.parse('')                // success

// 3a. grouping: put everything matched into a named group
var decimal_number = decimal.onemore().group('decimal_number')
decimal_number.parse('426')

// 2b. counted greedy repetition
var year = decimal.times(4).group('year')   // match 4 times
year.parse('1984')
var year = decimal.times(4,6).group('year') // match 4 to 6 times
year.parse('01984')

// HINT: .onemore() == .times(1,+inf)

// 3. output

// 3a. grouping (mentioned above)

// 3b. emittance control
var silent_year = year.emit()             // emit nothing
silent_year.parse('1989')                 // no output
var normal_year = silent_year.emit(a=>a)  // default: emit as is
normal_year.parse('1921')                 // normal output

// HINT: .group(name) == .emit(a=>make_group(a,name))

// 3c. significant / insiginifcant whitespaces
var sw = whitespace.zeromore()            // default: emit as is
var iw = whitespace.zeromore().emit()     // do not emit (silent)
var iw = whitespace.emit().zeromore()     // equivalent of above

sw.parse('   ')                    // output [3 whitespaces]
iw.parse('   ')                    // output [] (nothing)

// WARNING: iw always succeed, therefore you
// should NEVER call "rule.or(iw).zeromore()"

// 4. combination

// 4a. succession (match both succesively)
var num_num = iw.then(decimal_number).then(iw).then(decimal_number).then(iw)
var num_num = iw.then(decimal_number).then(iw).times(2) // equivalent of above
num_num.parse('  520   1314')
num_num.parse('1989  0535  ')
//num_num.parse('      360   ')    // ERROR

// 4b. alternative (match either)
var alpha = cr(c => 'a'<=c&&c<='z')
var word = alpha.onemore().group('word')
var num_or_word = decimal_number.or(word) // match either number or word
var num_or_word_num_or_word = iw.then(num_or_word).then(iw).times(2)
num_or_word_num_or_word.parse(' tank  man    ')
num_or_word_num_or_word.parse(' remember1989 ')

// 4c. use them together
var paradise = match('china').group('paradise')
var element = word.or(paradise)
var sentence = iw.then(element).then(iw).onemore()
sentence.parse('  air quality  of china is good')

// WARNING: iw always succeed, therefore you
// should NEVER call "rule.or(iw).zeromore()"
var elements = num_or_word.or(iw).zeromore()
// elements.parse('h3110 w0516')                               // inf loop
var elements = iw.then(num_or_word).then(iw).zeromore().or(iw)
elements.parse('h3110 w0516')                                  // safe

// 5. high level use

// 5a. parse nested list
var lbrac = eq('(').emit()
var rbrac = eq(')').emit()
var _elements = ref(()=>elements)
// "_elements" references "elements" in the context

var list = lbrac.then(_elements).then(rbrac).group('list')
var element = iw.then(num_or_word.or(list)).then(iw)
var elements = element.onemore().or(iw) // empty string allowed

elements.parse(' ()the ( (onion)(router is (100percent )great ))')

// 5b. parse infix notation expression

// the infix emitter iteratively construct parse tree from
// a list of [elem op elem op elem ...]
var infix = l=>{
  ll = l.length||0
  if(ll%2==0)
  throw new Error('list length not odd: ' + ll +' ('+l.map(n=>n.type))
  while(l.length>1){
    var first = l.shift(),second = l.shift(), third = l.shift()
    var n = new node('infix');
    n.pos = second.pos; n.children = [second,first,third]
    l.unshift(n)
  }
  return l
}

// method 1: iterative (left associative)
var element = iw.then(num_or_word).then(iw)
var sum_operator = eq('+').or(eq('-')).group('operator')
var sum = element.then(sum_operator.then(element).zeromore()).emit(infix)
sum.parse('1-2-3')

// method 2: recursive (right associative)
var exp_operator = match('**').group('operator')
var _exp = ref(()=>exp)
var exp = element.then(exp_operator).then(_exp).or(element).emit(infix)
exp.parse('2**3**4')

// 5c. parse infix expression with operator precedence
var prod_operator = eq('*').or(eq('/')).group('operator')
// prod and sum is left associative
var prod = exp.then(prod_operator.then(exp).zeromore()).emit(infix)
var sum = prod.then(sum_operator.then(prod).zeromore()).emit(infix)

sum.parse('3-4- 5- 6')
sum.parse('3-4 *5 /6')
sum.parse('3**4**5*6')

// 5d. parse infix with nested quotes
var _sum = ref(()=>sum)
var quoted = lbrac.then(_sum).then(rbrac)
var element = iw.then(quoted.or(num_or_word)).then(iw)

var exp = element.then(exp_operator).then(_exp).or(element).emit(infix)
var prod = exp.then(prod_operator.then(exp).zeromore()).emit(infix)
var sum = prod.then(sum_operator.then(prod).zeromore()).emit(infix)
sum.parse('13-( (4-a)*2)*6 **b')

// 5e. lookahead: just match, but neither advance nor emit
var freeword = iw.then(word).then(iw)
var groupped = freeword.then(freeword.lookahead()).zeromore()
// greedily match words as long as there is a word ahead
.group('wordgroup').then(freeword).or(iw)

groupped.parse('word')
groupped.parse('groupped word')
groupped.parse('last word not in group')

var groupped = freeword.then(freeword.times(2).lookahead()).zeromore()
// greedily match words as long as there is 2 word ahead
.group('wordgroup').then(freeword.times(0,2)).or(iw)

groupped.parse('last two words not in group')

// 5f. parse infix
// - with abbreviated multiplication (i.e. 2a + 3(5 - 7)9
// - with function calls (i.e. word(arg1,arg2)
var free = x=>iw.then(x).then(iw)

var _expr = ref(()=>expr)
var quoted = lbrac.then(_expr).then(rbrac)
var element = free(quoted.or(num_or_word))

var nullsym = empty.group('null')
var arg = _expr.or(nullsym)
var args = arg.then(eq(',').emit().then(arg).zeromore())
var call = free(quoted.or(word))
.then(lbrac).then(args).then(rbrac).group('call').or(element)

var exp = call.then(exp_operator).then(_exp.or(call)).or(call).emit(infix)

var newop = name => l=>{
  l.push(new node('operator',name));return l
} // create new operator node

// precedence of abbr is higher than multiply but lower than exp
var abbr = free(exp)  // left: anything
.then(
  empty
  .emit(newop('*'))   // emit "*"
  .then(exp)          // right: anything
  .zeromore()
).emit(infix)

var prod = abbr.then(prod_operator.then(abbr).zeromore()).emit(infix)
var sum = prod.then(sum_operator.then(prod).zeromore()).emit(infix)
var expr = sum
expr.parse('1')
expr.parse('print(i)')
expr.parse('2**3**f(u+me,g(h(,,3)))')
expr.parse('f(9cc) / 2 a**3 -3 **2(5-7)2')

// 5g. parse entire program
var assign_op = free(eq('=')).group('operator')
var assignment = free(word).then(assign_op.then(expr).onemore()).emit(infix)
var statement = assignment.or(expr).group('statement')
var seperator = eq(';').emit()
var program = free(statement.then(seperator.then(statement).zeromore())
.group('program'))
program.parse('i=8;c=2i;print(3c)')

// 5h. parse nested list with open brackets
var _elements = ref(()=>elements)
var end_of_list = rbrac.or(eos.lookahead())
// eos => end_of_string
var list = lbrac.then(_elements).then(end_of_list).group('list')
var element = free(num_or_word.or(list))
var elements = free(element.zeromore()) // empty string allowed
elements.parse('a(2() (3 j 5')
