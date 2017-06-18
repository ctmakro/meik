var print = console.log
var cond = function(){
  var arr = arguments
  for(var i=0;i<arr.length;i+=2){
    if(arr[i+1]!==undefined){if(arr[i]){return arr[i+1]}}
    else{return arr[i]}
  }
}
var thisf = f=>function(a1,a2,a3,a4,a5){return f(this,a1,a2,a3,a4,a5)}
var range = i=>{var a=[];for(var j=0;j<i;j++)a.push(j);return a}
const make = require('./meik.js')

var nodelist = make(p=>{
  p.init = function(){
    this.list = []
    this.default = new node('char','n/a')
  }
  p.push = function(n){
    checknode(n)
    this.list.push(n)
  }
  p.at = function(pos){
    return ((pos<0) || (pos>=this.len()))?
    this.default : this.list[pos]
  }
  p.len = function(){return this.list.length}
})

var node = make(p=>{
  p.init = function(type,value){
    this.type = type
    this.value = value
    this.children = []
  }
  p.addChild = function(n){
    checknode(n)
    this.children.push(n)
  }

  // pretty printing of tree
  var vert = '│', hori = '─', bl = '└', ml = '├'
  var jfy = s=>s!==undefined?JSON.stringify(s):''

  p.prettyprint = function(prefix,children_prefix){
    var cp = children_prefix
    var n = this
    var out = ''
    out += prefix
    out += n.type+':'+jfy(n.value)+' ('+n.pos+') \n'
    var cl = n.children.length
    for(var i=0;i<cl;i++){
      if(i!==cl-1)
      out += n.children[i].prettyprint(cp + '├───', cp + '│   ');
      else
      out += n.children[i].prettyprint(cp + '└───', cp + '    ');
    }
    return out
  }

  p.visualize = function(){
    return this.prettyprint('','')
  }
})

var checknode = obj=>{
  if(!obj.type)
  throw new Error('input not node')
}

var fail = (pos,reason)=>{return {failed:true,pos,reason}}
var failed = n=>n.failed===true

var str2nodelist = str=>{
  var nl = new nodelist()
  nl.push(new node('char','(sos)'))
  str.split('').map(c=>nl.push(new node('char',c)))
  nl.push(new node('char','(eos)'))
  return nl
}

var rules = {}

var Rule = make(p=>{
  var tf = f=>{
    if(typeof f!=='function')throw new Error('not a function')
  }
  p.init = function(tester){
    tf(tester)
    this.tester = tester
    this.emitter = this.get_default_emitter()
    this._lookahead = false
  }
  p.wrap = function(){
    var r = new Rule(this.tester)
    r.emitter = this.emitter
    r._lookahead = this._lookahead
    var q = new Rule((nl,pos)=>{
      return r.test(nl,pos)
    })
    return q
  }

  // emission
  p.get_default_emitter = thisf(t=>(a=>a)) // emit as is
  p.get_none_emitter = thisf(t=>(a=>[])) // emit nothing
  p.emit = function(emitter){
    var r = this.wrap()
    r.emitter = emitter||this.get_none_emitter()
    return r
  }

  // positioning
  p.lookahead = function(){
    var r = this.wrap()
    r._lookahead = true
    return r
  }

  // evaluation
  p.test = function(nl,pos){
    var result = this.tester(nl,pos)
    if(failed(result))return result
    result.emit = this._lookahead?[]:this.emitter(result.emit, pos)
    if(!result.emit) throw new Error('emitter returned nothing')
    result.pos = this._lookahead?pos:result.pos
    return result
  }

  // utilities
  function fancyerror(nl,result){
    // get context
    var context = '', cursorpos = 0
    var pos = result.pos
    for(var i=pos-10; i<pos+5; i++){
      var c = nl.at(i)
      var temp = c===false ? ' ' : (c.value==='n/a'?' ':c.value)
      if(i===pos)cursorpos = context.length;
      context += temp
    }
    var cursor =
    range(context.length)
    .map(i=>i==cursorpos?'^':' ')
    .join('')

    return `parse failed at pos ${result.pos}\n`
    +`${context}\n${cursor}\n`
    +`reason: ${result.reason}\n`
  }

  p.parse = function(str){
    print('"'+str+'"')

    var rule = sos.emit().then(this).then((eos).emit()) // start and end matching

    var nl = str2nodelist(str)
    var result = rule.test(nl,0)
    if(failed(result))throw new Error(fancyerror(nl,result))

    var visualization = result.emit.map(n=>n.visualize())

    print('->')
    print(visualization.join(''))

    return result.emit
  }

  // emission grouping
  var group = name => (l, pos)=>{
    var n = new node(name)
    n.children = l; n.pos = pos
    return [n]
  }
  p.group = function(str){
    return this.emit(group(str))
  }

  // combination
  p.then = function(rule2){
    checkrule(rule2)
    return new Rule((nl,pos)=>{
      var result1 = this.test(nl,pos)
      if(failed(result1))return result1
      var result2 = rule2.test(nl,result1.pos)
      if(failed(result2))return result2
      return {pos:result2.pos, emit:result1.emit.concat(result2.emit)}
    })
  }

  p.or = function(rule2){
    checkrule(rule2)
    return new Rule((nl,pos)=>{
      var result1 = this.test(nl,pos)
      if(!failed(result1))return result1
      return rule2.test(nl,pos)
    })
  }

  p.not = function(){
    return new Rule((nl,pos)=>{
      var result1 = this.test(nl,pos)
      if(failed(result1)) return {pos, emit:[]}
      return fail(pos, `'not' rule being used`)
    })
  }

  // iterative transformation
  p.zeromore = thisf(t=>t._iter(c=>false, c=>true))
  p.onemore = thisf(t=>t._iter(c=>c<1, c=>true))
  p._times = thisf((t,start,stop)=>t._iter(c=>(c<start), c=>(c<stop)))

  p.times = function(start,stop){
    if(start===undefined) throw new Error('please provide start');
    if(start>(stop||start)) throw new Error('start bigger than stop');
    return this._times(start,(stop||start))
  }

  var mapcon = l=>l.reduce((a,b)=>a.concat(b),[])
  p._iter = function(condfail,condgo){
    return new Rule((nl,pos)=>{
      var nowpos = pos, emit = [], counter = 0;
      while(condgo(counter)){
        var result = this.test(nl,nowpos)
        if(failed(result))break;

        counter+=1
        emit.push(result.emit)
        nowpos = result.pos
      }
      if(condfail(counter)) return result;
      return {pos:nowpos, emit:mapcon(emit)}
    })
  }
})
var checkchar = n=>{
  if(n.type!=='char')throw new Error('input node type not char')
}
var checkrule = r=>{
  if(r&&r.tester){}else{throw new Error('input is not a rule')}
}

var cr = (det,name) => new Rule( // conditional rule generator
  function(nl,pos){
    var n = nl.at(pos)
    checkchar(n)
    if(det(n.value)){
      n.pos = pos
      return {pos:pos+1, emit:[n]}
    }
    return fail(pos,`unexpected char: "${n.value}"\n`
    +`does not satisfy rule: ${name||det}`)
  }
)

var eq = (ch,name)=>cr(c=>c===ch,(name||`"${ch}"`)) // equality rule generator
var arrayify = str=>str.split('')
var within = str=>cr(c=>str.indexOf(c)>=0,'within '+str)
var not_within = str=>cr(c=>str.indexOf(c)<0,'not within '+str)

var eos = eq('(eos)','eos(end of string)')
var sos = eq('(sos)','sos(start of string)')

var empty = new Rule(
  function(nl,pos){
    var n = nl.at(pos)
    checkchar(n)
    return {pos, emit:[]} // empty list matched
  }
)

var match = str=>arrayify(str)
.map(c=>eq(c,'match '+str))
.reduce((a,b)=>a.then(b))

var decimal = cr(c=>'0'<=c&&c<='9')
var binary = cr(c=>(c=='0'||c=='1'))

var decstr = decimal.then(decimal.zeromore())
.group('decstr')

var bin = match('0b')
.emit()
.then(binary).then(binary.zeromore())
.group('binary_literal')

// decstr.parse('12345')
// bin.parse('0b110')

var wsp = eq(' ','whitespace')
var newline = eq('\n','newline')

// insiginifcant whitespace
var iw = wsp.zeromore().emit();

// ignore insiginifcant whitespace
var iiw = r=>iw.then(r).then(iw)

var decsym = iw.then(iiw((bin).or(decstr)).zeromore()).group('program')

// decsym.parse('12345 124 13 0b10     22 0b111')
// decsym.parse('  ')
// decsym.parse('  134 1 2')

// rule reference
var ref = rf => {
  return new Rule(
    function(stream,pos){
      var r = rf()
      checkrule(r)
      return r.test.apply(r,arguments)
    }
  )
}

module.exports = {
  Rule,
  node,

  // rule generators
  cr,
  eq,
  match,
  within,
  not_within,

  // default rules
  empty,
  eos,
  sos,

  // helper
  ref,
}
