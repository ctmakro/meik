var make = require('./meik.js')
var thisf = f=>function(a1,a2,a3,a4,a5){return f(this,a1,a2,a3,a4,a5)}
var cond = function(){
  var arr = arguments
  for(var i=0;i<arr.length;i+=2){
    if(arr[i+1]!==undefined){if(arr[i]){return arr[i+1]}}
    else{return arr[i]}
  }
}
var print = console.log
var debug_flag = true
var dp = function(){if(debug_flag)print.apply(null,arguments)}
var range = i=>{var a=[];for(var j=0;j<i;j++)a.push(j);return a}
var last = (arr,s)=>arr[arr.length-1-(s||0)]
var first = arr=>arr[0]

print(cond(
  false,'1f',
  true,'2f',
  '3f'
))


var program =
`
_
__
= x 2
= x
__+ 3 2
___
print x
while
__> x 0
__= x
____- x 1
__
iif
__> x 2
__- x 1
__+ x
____* 5 x`.replace(/_/g,' ')

dp(program)

var error = str=>{throw 'parse error: '+str}

var node = make(p=>{
  p.init = function(type,symbol){
    if(type==='symbol'){
      this.symbol = symbol
    }else if (type==='list'){
      this.children = []
    }else{
      throw 'unsupported node type'
    }
    this.type = type
  }
  p.setParent = function (parent) {
    this.parent = parent
    parent.children.push(this)
    return this
  }
})

var sy_node = (s)=>new node('symbol',s)
var li_node = ()=>new node('list')

const eve = require('events')

var SymbolStateMachine = eve.make(p=>{
  p.init = thisf(t=>t.reset())
  p.reset = thisf(t=>t.start())

  p.start = thisf(t=>{t.cache=''})
  p.in = thisf((t,c)=>{t.cache+=c})
  p.end = thisf(t=>{
    dp('(ssm)symbol',t.cache)
    t.emit('symbol',t.cache)
  })
})

var ListStateMachine = eve.make(p=>{
  p.init = thisf(t=>t.reset())
  p.reset = function(){
    this.rootnode = li_node(null)
    this.currnode = this.rootnode
  }

  p.append = thisf((t,node)=>node.setParent(t.currnode))
  p.push = thisf(t=>{dp('(lsm)->');t.currnode=li_node().setParent(t.currnode)})
  p.pop = thisf(t=>{dp('(lsm)<-');t.currnode=t.currnode.parent})
})

var IndentStateMachine = eve.make(p=>{
  p.init = function(){
    this.reset()
  }
  p.reset=function(){
    dp('(ism)reset')
    this.stack = []
    this.count = 0
  }

  // indent counting
  p.start = function(){
    dp('(ism)start')
    this.count = 0
  }
  p.in = thisf(t=>{t.count++})
  p.end = function(){this.got_indent(this.count)}

  // indent stacking
  p.last = thisf(t=>last(t.stack))
  p.push = function(i){
    this.stack.push(i)
    dp('(ism.stack)push',i,this.stack)
  }
  p.pop = function(){
    var k= this.stack.pop()
    dp('(ism.stack)pop',k,this.stack)
    return k
  }

  // indent event handling
  p.got_indent = function(i){
    dp('(ism.stack)got_indent',i)
    if(i>this.last()||this.stack.length==0){ // more indentation
      this.push(i)
      this.emit('push')
    }else{ // less or equal
      this.emit('pop')
      // lsm.pop()
      while(i<this.last()){ // while less
        this.pop()
        this.emit('pop')
      }
      if(i>this.last()){throw 'indentation imbalance'}

      this.emit('push')
    }
  }
})

// state machinery
var parsing_statemachine = function(){
  // node switching state machine
  var lsm = new ListStateMachine()

  // indent parsing state machine
  var ins = new IndentStateMachine()

  // symbol parsing state machine
  var sy = new SymbolStateMachine()

  // state reset
  var reset = ()=>{
    sy.reset()
    lsm.reset()
    ins.reset()
    state = 'linestart'
  }

  // when a symbol is parsed
  sy.on('symbol',(s)=>{
    lsm.append(new node('symbol',s))
  })

  // upon receiving EOS
  var str_end=()=>{
    ins.got_indent(0) // indent set to 0
    lsm.rootnode.children.pop()
  }

  // when indentation decides that lists should open or close
  ins.on('push',()=>{lsm.push()})
  ins.on('pop',()=>{lsm.pop()})

  // stack growth chart
  //      ()
  //   [ = x 2 (0)
  // ][ = x  (0)
  // [ + 3 2 (0,2)
  //
  // ]] [ prn x (0)
  // ] [ whi (0)
  // [ > x 0 (0,2)
  // ][ = x (0,2)
  // [ - x 1 (0,2,4)
  // end: ]]] ()

  // input character categorization
  var there = (c,str)=>(str.indexOf(c)>=0) // include
  var eq = str=> c=>c===str // equal

  var symbol = c=>
  ('a'<=c && c<='z') || ('A'<=c && c<='Z')||
  ('0'<=c && c<='9') || there(c,'.<>?=_-+*/')

  var space = eq(' ')
  var endl = eq('\n')
  var eos = eq('\0')

  // the categorizer
  var cat = c=>cond(
    symbol(c),'symbol',
    space(c),'space',
    endl(c),'newline',
    eos(c),'eos',
    'invalid'
  )

  // initial state
  // var state = 'linestart'

  var CharacterStateMachine = make(p=>{
    p.init = function(){
      this.reset()
    }
    p.reset = function(){
      this.state = 'linestart'
      this.smap = {}
    }

    // one character in
    p.eat = function(c){
      var char_category = cat(c)

      // if current state exists in smap
      var smap_state = this.smap[this.state]
      if(!smap_state)error(`unexpected state: ${state}`)

      // if handler exists for current character type
      var handler = smap_state[char_category]
      if(!handler)error(`handler not found for '${c}' of category: ${cat(c)} on state ${state}`)

      //call the handler
      handler(c);
    }

    // register state transitions
    p.reg = function(statename){
      var statenames = (typeof statename=='string')?[statename]:statename;
      var r = (cat,nextstatename,handler)=>{
        statenames.map(sn=>{
          this.smap[sn] = this.smap[sn]||{}
          this.smap[sn][cat] = (c)=>{this.state=nextstatename; handler(c)}
        })
        return r
      }
      return r
    }
  })

  var smap = new CharacterStateMachine()

  smap.reg('linestart') // at start of line
  ('symbol','symbol',c=>{ins.start();ins.end();sy.start();sy.in(c)})
  ('space','indenting',c=>{ins.start();ins.in()})

  smap.reg('indenting') // during indentation of line
  ('symbol','symbol',c=>{ins.end();sy.start();sy.in(c)})
  ('space','indenting',c=>{ins.in()})

  smap.reg('symbol') // during symbol
  ('symbol','symbol',c=>{sy.in(c)})
  ('space','spacing',c=>{sy.end()})
  ('newline','linestart',c=>{sy.end()})

  smap.reg('spacing') // during spaces between symbol
  ('symbol','symbol',c=>{sy.start();sy.in(c)})
  ('space','spacing',c=>{})

  smap.reg(['linestart','spacing','indenting'])
  ('newline','linestart',c=>{})
  ('eos','eos',c=>{str_end()})

  smap.reg(['symbol'])
  ('eos','eos',c=>{sy.end();str_end()})

  function eat(c){smap.eat(c)}
  function show_state_map(){print(smap.smap)}

  function get_tree(){
    if((smap.state=='eos')&&(ins.stack.length==1)){
      return lsm.rootnode
    }else{
      print(state,ins.stack)
      throw 'parsing not completed'
    }
  }

  function parse(str){ // success or failure
    reset()
    for(var i=0;i<str.length;i++){
      eat(str[i])
    }
    eat('\0')
    return get_tree()
  }

  return {
    parse,
    // get_tree,
    show_state_map,
  }
}

var psm = parsing_statemachine()

function traverse(node,f,depth){
  depth=depth||0
  f(node,depth)
  if(node.children){
    node.children.map(leaf=>{
      traverse(leaf,f,depth+1)
    })
  }
}

function parse_and_print (str){
  var tree = psm.parse(str)

  traverse(tree,(node,depth)=>{
    print(
      range(depth*4).map(x=>(x>(depth-1)*4)?'-':' ').join(''),
      node.type,
      node.symbol?node.symbol:''
    )
  })
}

var value_parsers = [
  function trynum(str){
    var accepted = ''
    var dot = false
    for(var i=0;i<str.length;i++){
      var c = str[i];
      if('0'<c && c<'9'){
        accepted+=c
      }else if(c=='.'&&dot==false){
        accepted+=c
        dot = true
      }else{
        return null
      }
    }
    return Number(accepted)
  },
  function trybool(str){
    if(str==='true')return true
    if(str==='false')return false
    return null
  },
]

// determine value for symbol node
function value(synode){
  var str = synode.symbol
  for(f of value_parsers){
    var res = f(str)
    if(res!==undefined){
      return res
    }
  }
  return synode
}


// variable map
var red = (f,r) => l => l.reduce(f,r||0)

// input l : list which elements were evaluated
var vmap = {
  '+':red((a,b)=>a+b),
  '-':l=>l[0]+red((a,b)=>a-b)(l.slice(1)),
  '*':red((a,b)=>a*b,1),
  '/':l=>l[0]/red((a,b)=>a*b,1),

  '=':l=>{vmap[l[0]] = l[1]},

  // while:l=>{while()}

  print:l=>print.apply(null,l),

}

function eval(node){ // non-root node
  if(node.children){

  }

}

parse_and_print(program)
