var print = console.log
var cond = function(){
  var arr = arguments
  for(var i=0;i<arr.length;i+=2){
    if(arr[i+1]!==undefined){if(arr[i]){return arr[i+1]}}
    else{return arr[i]}
  }
}

function Stream(str){
  if(typeof str!=='string')throw new Error('not a string')
  this.str = str
}
Stream.prototype.at = function(pos){
  return ((pos<0) || (pos>=this.str.length))?
  false:this.str[pos]
}
Stream.prototype.range = function(start,len){
  var result = ''
  for(var i=start;i<start+len;i++){
    var c = this.at(i)
    if(c!==false){
      result+=c;
    }else{
      return false
    }
  }
  return result
}
Stream.prototype.len = function(){return this.str.length}

// class Rule(test)
// where test == function(stream,pos){
//  if stream[pos] satisfies rule
//    return {pos:new_pos, emit:emitted_string}
//  else
//    return false
// }

function Rule(tester){
  this.tester = tester
}

Rule.prototype.copy = function(){
  var nr = new Rule(this.tester)
  nr.emitter = this.emitter;
  nr.positioner = this.positioner;
  return nr
}

var poscache = 0

Rule.prototype.test = function(stream,nowpos){
  poscache = nowpos // just record
  var result = this.tester(stream,nowpos)
  if(result===false){
    return result;
  }else{
    // emission variation
    result.emit = this.emitter?
    this.emitter(result.emit):result.emit

    // position variation
    result.pos = this.positioner?
    this.positioner(nowpos,result.pos):result.pos

    return result
  }
}
// set emitter
Rule.prototype.emit = function(emitter){
  if(!emitter){
    emitter = ''
  }
  if(typeof emitter==='string'){
    var _toemit = emitter;
    emitter = e=>_toemit
  }

  var newrule = this.copy()
  newrule.emitter = emitter
  return newrule
}

// set positioner
Rule.prototype.pos = function(positioner){
  if(!positioner){
    positioner = (before,after)=>{
      return before
    }
  }
  var newrule = this.copy()
  newrule.positioner = positioner
  return newrule
}

Rule.prototype.repeat = function(){
  var rule = this
  return new Rule(
    function(stream,pos){
      var results = []
      var nowpos = pos
      while(true){
        var result = rule.test(stream,nowpos)
        if(result===false)break;
        results.push(result)
        nowpos=result.pos
      }
      return {
        pos:nowpos,
        emit:results.map(r=>r.emit).join('')
      }
    }
  )
}

Rule.prototype.and = function(rule2){
  var rule1 = this
  return new Rule(
    function(stream,pos){
      var result1 = rule1.test(stream,pos)
      if(result1===false)return false
      var result2 = rule2.test(stream,result1.pos)
      return result2 && { // js lazy eval
        pos:result2.pos,
        emit:result1.emit + result2.emit
      }
    }
  )
}

Rule.prototype.or = function(rule2){
  var rule1 = this
  return new Rule(
    function(stream,pos){ // js lazy eval
      var result1 = rule1.test(stream,pos)
      if(result1!==false) return result1
      var result2 = rule2.test(stream,pos)
      return result2
    }
  )
}

Rule.prototype.not = function(){
  var rule = this
  return new Rule(
    function(stream,pos){
      var result = rule.test(stream,pos)
      return (result===false)?{pos:pos,emit:''}:false;
    }
  )
}

Rule.prototype.parse = function(str){
  var stream = new Stream(str)
  var rule = this

  var result = rule.test(stream,0)
  if(result===false){
    throw new Error(`parse failed (rule mismatch): at position ${poscache}: "${stream.at(poscache)}"`)
  }else{
    var pos = result.pos
    var emit = result.emit

    if(pos!==stream.len()){
      throw new Error(`parse failed (length mismatch): ${pos} parsed vs ${stream.len()} total`)
    }
    return emit
  }
}

var scr = cond=>{
  return new Rule(
    function(stream,pos){
      var c = stream.at(pos)
      if(c===false)return false
      return cond(c)?{pos:pos+1,emit:c}:false
    }
  )
}

var match = str=>{
  return new Rule(
    function(stream,pos){
      var c = stream.range(pos,str.length)
      if(c===false)return false
      return (c===str)?{pos:pos+c.length,emit:c}:false
    }
  )
}

var eos = new Rule(
  function(stream,pos){
    if(stream.len()===pos){
      return {pos:pos,emit:''}
    }
    return false
  }
)

var empty = match('')
var any = scr(c=>c!==false)

var emgen = (name)=> s=> `<${name}>\n${s}\n</${name}>\n`

var numeric = scr(c=>'0'<=c&&c<='9')
var alpha = scr(c=>('a'<=c&&c<='z')||('A'<=c&&c<='Z'))

var within = str => scr(c=>(str.indexOf(c)>=0)) // include
var notwithin = str => scr(c=>(str.indexOf(c)<0))
var whitespace = match(' ')

// recursive reference
var ref = rf => {
  return new Rule(
    function(stream,pos){
      var r = rf()
      return r.test.apply(r,arguments)
    }
  )
}

module.exports = {
  Rule,

  empty,
  eos,
  numeric,
  alpha,
  whitespace,
  any,

  within,
  notwithin,
  match,
  scr,

  ref,

  emgen,
}

// insiginifcant whitespaces
var iw = whitespace.repeat().or(empty).emit()

// control
var newline = within('\n\r').emit()
var newlines = newline.repeat()
var endsymbol = newline
.or(within('\t ()'))
.or(eos)
.pos().emit()

// comment
var hashtag = match('#')
var notnewline = notwithin('\n\r')
var comment = hashtag.emit()
.and(iw)
.and(notnewline.repeat().or(empty))
.emit(emgen('comment'))

// empty linelet
var emptylinelet =
iw
.and(comment.or(empty))
.and(newline.or(eos))
.emit(emgen('emptylinelet'))

// hex
var hexdigit = within('abcdefABCDEF')
.emit(e=>e.toLowerCase())
.or(numeric)
var hexnum = match('0x').emit() // emit nothing
.and(hexdigit).and(hexdigit.repeat())
.and(endsymbol)
.emit(emgen('hex'))

// bin
var bindigit = within('01')
var binnum = match('0b').emit() // emit nothing
.and(bindigit).and(bindigit.repeat())
.and(endsymbol)
.emit(emgen('bin'))

// dec
var dot = match('.')
var sign = within('+-')
var dec_str = numeric.and(numeric.repeat())

var decnum =
sign.or(empty)
.and(
  dec_str.and(dot).and(dec_str)
  .or(dec_str.and(dot))
  .or(dot.and(dec_str))
  .or(dec_str)
)
.and(
  within('eE').and(sign.or(empty)).and(dec_str).or(empty)
)
.and(endsymbol)
.emit(emgen('dec'))

// symbol
var symbolstart = alpha.or(within('+-*/_-.'))
var symbolchar = symbolstart.or(numeric)
var symbol = symbolstart.and(symbolchar.repeat())
.and(endsymbol)
.emit(emgen('symbol'))

// indentation
var indent = whitespace
.repeat()
.emit(s=>`<indent>${s.length}</indent>\n`)

// recursion
var _inlinelist = ref(r=>inlinelist)

// continue to next available line
var contline = match('\\').emit('(contliner\\)')
.and(iw)
.and(comment.or(empty))
.and(emptylinelet.repeat())

// element
var elem = decnum
.or(hexnum)
.or(binnum)
.or(symbol)
.or(_inlinelist)
.or(contline)
.and(iw)

// elements
var elements = elem.and(elem.repeat())

// brackets
var lbrac = match('(').emit()
var rbrac = match(')').emit()

// list
var inlinelist = lbrac
.and(iw)
.and(elements)
.and(
  rbrac.and(iw) // stop the list if rbrac met
  .or(newline.pos()) // stop the list if newline met
  .or(comment.pos()) // if comment met
)
.emit(emgen('list'))

var filledlinelet =
indent
.and(elements)
.and(comment.or(empty))
.emit(emgen('linelet'))

var line = emptylinelet.or(filledlinelet)
var lines = line.and(newlines).repeat()

// print(lines.parse('3e9 abc ( 8'))
// print(line.parse(' 3e9  abc   ( (0x8 0b1    #  a ss'))
// print(line.parse('3e9(abc(  0x8 0b1    #  a ss'))
// print(line.parse(' #s'))
