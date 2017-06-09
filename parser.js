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

var debug_flag = false
var dp = function(){if(debug_flag)print.apply(null,arguments)}
var range = i=>{var a=[];for(var j=0;j<i;j++)a.push(j);return a}
var last = (arr,s)=>arr[arr.length-1-(s||0)]
var first = arr=>arr[0]

dp(cond(
  false,'1f',
  true,'2f',
  '3f'
))

var program =
`
__
= x 2
= x
  + 3 2 y

= x (+ 3 2 y
* x (+ 1.5 6 (* 2 3

+ (* 3 3) (* 4 4
  * 5 5
  * 6 6

+
  (3) 4 5
  3 4 5
  (3 4 5

* (+ 1 2)(+ 3 4)
___
+ 'holy' 'fuc ing' spaces
print x
while
__> x 0.2
__= x
____- x 178
__
iif
__> x 2
__- x 1
__+ x
____* 5 x`.replace(/_/g,' ')

// dp(program)

var error = str=>{throw new Error(str)}

var node = make(p=>{
  p.init = function(type,symbol){
    if(type==='symbol'){
      this.symbol = symbol
    } else if (type==='string'){
      this.string = symbol
    } else if (type==='list'){
      this.children = []
    } else {
      throw new Error('unsupported node type')
    }
    this.type = type
  }
  p.setParent = function (parent) {
    if(!parent&&parent!==null){
      throw new Error('parent invalid in setParent')
    }

    this.parent = parent

    if(parent!==null){
      parent.children.push(this)
    }else{
      // don't do anything if parent is null
    }
    return this
  }
})

var sy_node = (s)=>new node('symbol',s)
var li_node = ()=>new node('list')

const eve = require('events')
var InitResetMixin = p=>{
  p.init = thisf(t=>t.reset())
}
var SymbolStateMachine = eve.make(InitResetMixin).make(p=>{
  p.reset = thisf(t=>t.start())

  p.start = thisf(t=>{t.cache=''})
  p.in = thisf((t,c)=>{t.cache+=c})
  p.end = thisf(t=>{
    dp('(ssm)symbol',t.cache)
    t.emit('symbol',t.cache)
  })
})

var StringStateMachine = SymbolStateMachine.make(p=>{
  p.end = thisf(t=>{
    dp('(ssm)string',t.cache)
    t.emit('string',t.cache)
  })
})

var ListStateMachine = eve.make(InitResetMixin).make(p=>{
  p.reset = function(){
    this.rootnode = null//li_node(null)
    this.currnode = this.rootnode
  }

  p.append = function(node){
    node.setParent(this.currnode)
  }

  p.push = function(){
    dp('(lsm)->');
    this.currnode=li_node().setParent(this.currnode)
  }

  p.pop = function(){
    dp('(lsm)<-');
    var curr = this.currnode
    this.currnode = curr.parent

    if(this.currnode===this.rootnode){ // null === null
      this.emit('list',curr)
    }
  }
})

var RefCounter = eve.make(InitResetMixin).make(p=>{
  p.reset = function(){
    this.count = 0
  }

  p.inc = thisf(t=>{
    t.count++;t.emit('inc');dp('(brc)+')
  })
  p.dec = thisf(t=>{
    t.count--;t.check();t.emit('dec');dp('(brc)-')
  })

  p.check = thisf(t=>{
    if(t.count<0)throw new Error('ref underflow');
  })
  p.zero = thisf(t=>t.count===0)
})

var BraceCounter = RefCounter.make(p=>{
  p.closebraces = function(){
    while(this.count>0){
      this.dec()
    }
  }
})

var IndentStateMachine = eve.make(InitResetMixin).make(p=>{
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
    if(this.stack.length===0)error('indentation stack underflow')
    var k = this.stack.pop()
    dp('(ism.stack)pop',k,this.stack)
    return k
  }

  // indent event handling
  p.got_indent = function(i){
    dp('(ism.stack)got_indent',i)
    if(i>this.last()||this.stack.length===0){ // more indentation
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

  p.end_indent = function(){
    while(this.stack.length!==0){
      this.pop()
      this.emit('pop')
    }
  }
})

// state machinery
var parsing_statemachine = function(){
  var lsm = new ListStateMachine()
  var ins = new IndentStateMachine()
  var sy = new SymbolStateMachine()
  var st = new StringStateMachine()

  // state reset
  var reset = ()=>{
    sy.reset()
    lsm.reset()
    ins.reset()
    csm.reset()
    st.reset()

    brc.reset()
  }

  var brc = new BraceCounter()

  // when a symbol is parsed
  sy.on('symbol',(s)=>{
    lsm.append(new node('symbol',s))
  })

  // when a string is parsed
  st.on('string',s=>{
    lsm.append(new node('string',s))
  })

  // upon receiving EOS
  var str_end=()=>{
    // ins.got_indent(0) // indent set to 0
    ins.end_indent()
    // lsm.rootnode.children.pop()
  }

  // when indentation decides that lists should open or close themselves
  ins.on('push',()=>{lsm.push()})
  ins.on('pop',()=>{lsm.pop()})

  // when braces decides that lists should open or close themselves
  brc
  .on('inc',()=>{lsm.push()})
  .on('dec',()=>{lsm.pop()})

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
  ('0'<=c && c<='9') || there(c,`:.<>?=_-+*/!%^&@$\\`)

  var space = eq(' ')
  var endl = eq('\n')
  var eos = eq('\0')
  var quote = eq("'")

  // valid char for string literal
  var validstr = c=>(csm.state==='quoting')
  &&(!(endl(c)||eos(c)||quote(c)))

  var lbr = eq('(')
  var rbr = eq(')')

  // the categorizer
  var cat = c=>cond(
    validstr(c),'string',
    lbr(c),'lbr',
    rbr(c),'rbr',
    symbol(c),'symbol',
    space(c),'space',
    endl(c),'newline',
    eos(c),'eos',
    quote(c),'quote',
    'invalid-category'
  )

  // initial state
  // var state = 'linestart'

  var CharacterStateMachine = make(p=>{
    p.init = function(){
      this.reset()
      this.smap = {}
    }
    p.reset = function(){
      this.state = 'linestart'
    }

    // one character in
    p.eat = function(c){
      var char_category = cat(c)

      // if current state exists in smap
      var smap_state = this.smap[this.state]
      if(!smap_state)error(`unexpected state: ${this.state}`)

      // if handler exists for current character type
      var handler = smap_state[char_category]
      if(!handler)error(`handler not found for '${c}' of category: ${char_category} on state ${this.state}`)

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

  var csm = new CharacterStateMachine()

  csm.reg('linestart') // at start of line
  ('symbol','symboling',c=>{ins.start();ins.end();sy.start();sy.in(c)})
  ('space','indenting',c=>{ins.start();ins.in()})

  csm.reg('indenting') // during indentation of line
  ('symbol','symboling',c=>{ins.end();sy.start();sy.in(c)})
  ('space','indenting',c=>{ins.in()})
  ('quote','quoting',c=>{ins.end();st.start()})

  csm.reg('symboling') // during symbol
  ('symbol','symboling',c=>{sy.in(c)})
  ('space','spacing',c=>{sy.end()})
  ('newline','linestart',c=>{sy.end(),brc.closebraces()})

  csm.reg('spacing') // during spaces between symbol
  ('symbol','symboling',c=>{sy.start();sy.in(c)})
  ('space','spacing',c=>{})
  ('quote','quoting',c=>{st.start();})

  csm.reg('quoting') // during anything between quote
  ('string','quoting',c=>{st.in(c)})
  ('quote','quoted',c=>{st.end()})

  csm.reg('quoted') //exit quote
  ('space','spacing',c=>{})

  csm.reg('symboling')('lbr','spacing',c=>{sy.end();brc.inc()})
  csm.reg('linestart')('lbr','spacing',c=>{ins.start();ins.end();brc.inc()})
  csm.reg('indenting')('lbr','spacing',c=>{
    ins.end();brc.inc();
  })

  csm.reg(['spacing','quoted'])
  ('lbr','spacing',c=>{brc.inc()})

  csm.reg('symboling')('rbr','spacing',c=>{sy.end();brc.dec()})
  csm.reg(['spacing','quoted'])('rbr','spacing',c=>{brc.dec();})

  csm.reg(['linestart','spacing','indenting','quoted'])
  ('newline','linestart',c=>{brc.closebraces()})
  ('eos','eos',c=>{brc.closebraces();str_end()})

  csm.reg(['symboling'])
  ('eos','eos',c=>{sy.end();brc.closebraces();str_end()})

  function show_state_map(){print(csm.smap)}

  var lot = [] // list of trees
  lsm.on('list',node=>{
    lot.push(node)
  })

  function parse(str){ // success or failure
    dp('begin parse')
    reset()
    lot = []

    for(var i=0;i<str.length;i++){
      csm.eat(str[i])
    }
    csm.eat('\0')
    dp('end parse')

    return lot
  }

  return {
    parse,
    // get_tree,
    show_state_map,
  }
}

// debug_flag=true

var psm = parsing_statemachine()
module.exports = psm

var sp = depth=>put(range(depth*4).map(c=>' ').join(''))

var strbuf = ''
var put = function(s){
  // process.stdout.write.apply(process.stdout,arguments)
  strbuf += s
}

var expand = (node,depth)=>{
  depth=depth||0
  cond(
    node.type==='symbol',()=>{put(''+node.symbol+' ')},
    node.type==='string',()=>{put('"'+node.string+'"')},
    node.type==='list',()=>{
      put('\n');sp(depth);put('(')
      node.children.map(c=>{expand(c,depth+1)})
      put(')');//sp(depth-1)
    },
    ()=>{throw new Error('unknown node type')}
  )()
}

// visually explain
psm.explain = function(node){
  strbuf = ''
  expand(node)
  return strbuf
}

function test(){
  print('program:')
  print(program)

  print('\nparsed:')
  var lot = psm.parse(program)
  lot.map(n=>{print(psm.explain(n))})

  print(listify(lot))
}

// test()
// test()

function listify(lot){
  // var lot = psm.parse(prog)

  var reduce_node = node=>{
    return cond(
      node.type==='list',()=>{return node.children.map(reduce_node)},
      node.type==='string',()=>{return node.string},
      node.type==='symbol',()=>{return node.symbol},
      ()=>{throw new Error('unknown node type')}
    )()
  }

  var res = lot.map(reduce_node)
  return res
}

function json(s){
  return JSON.stringify(s,null,4)
}

// print(json(listify(program)))
psm.listify = listify
