var parser = require('./parser.js')

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
var there = (c,str)=>(str.indexOf(c)>=0) // include


function parse_and_print (str){
  var lot = parser.parse(str)

  lot.map(n=>
  traverse(n,(node,depth)=>{
    print(
      range(depth*4).map(x=>(x>(depth-1)*4)?'-':' ').join(''),
      node.type,
      node.symbol?node.symbol:''
    )
  })
  )

  return lot
}

function traverse_lisp(node,f){
  print()
}

function traverse(node,f,depth){
  depth=depth||0
  f(node,depth)
  if(node.children){
    node.children.map(leaf=>{
      traverse(leaf,f,depth+1)
    })
  }
}

var value_parsers = [
  function tryexisted(str){
    if(vmap[str]!==undefined){
      dp('(vp) found in vmap:',str)
      return vmap[str]
    }
    return null
  },
  function trynum(str){
    var accepted = ''
    var dot = false
    for(var i=0; i<str.length; i++){
      var c = str[i];
      if(there(c,'+-') && i===0){
        accepted+=c
      }else if('0'<=c && c<='9'){
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
function detvalue(synode){
  var str = synode.symbol

  dp('(detvalue)',str)

  for(f of value_parsers){
    var res = f(str)
    if(res!==null){
      dp('(detvalue)('+typeof res+')')
      return res
    }
  }

  throw new Error('unknown symbol: '+str)
}


// variable map
var red = (f,r) => l => l.reduce(f,r||0)

// input l : list which elements were evaluated
var vmap = {
  '+':red((a,b)=>a+b),
  '-':l=>l[0]+red((a,b)=>a-b)(l.slice(1)),
  '*':red((a,b)=>a*b,1),
  '/':l=>l[0]/red((a,b)=>a*b,1)(l.slice(1)),

  '=':l=>{dp('(=)',l);vmap[l[0]] = l[1]},

  // 'while':l=>{while()}

  print:l=>print.apply(null,l),

}

function tryreduce(el){
  // try to reduce this list, via function calling
  var f = el[0]
  var args = el.slice(1)

  if(typeof f!=='function')
  throw new Error('list[0] is not a function')

  return f(args)
}

function evalnode(node){ // non-root node
  if(node.type==='list'){ // if list
    var el = node.children.map(c=>evalnode(c))
    return tryreduce(el) // should return value node
  }else if(node.type==='string'){ // if string
    return node.string
  }else{
    return detvalue(node) // should return value
  }
}


var pt = k=>{print(k, typeof k);}

var trip = function(){print();print.apply(this,arguments);print()}

var run = str=>{
  trip('code:---------------')
  print(str);

  trip('traversal:----------')
  var lot = parse_and_print(str)

  trip('lispy:--------------')
  lot.map(n=>parser.explain(n))

  trip('evaluate:-----------')
  trip('result:',lot.map(n=>evalnode(n)))
}

function test(){
  // pt(detvalue({symbol:'1.1'}))
  // pt(detvalue({symbol:'+'}))

  // print(evalroot(tree))
  run('+ 4 5\n+ 8 9 10')
  run('- -3 7 1.4')
  run(
    `
    = 'x' 20
    + x 8
    `
  )
  run(`+\n  * 5 3\n  * 6 7`)
  run(`print 'shit'`)
  run(`print\n *\n  + 1 2\n  + 3 4 x`)
  run(
    `
    = 'x' 20
    = 'j' 40
    print (* x j)
    print
      * x j
      + x j
      - x j
      / x j
      + x j j
    `
  )
}

test()
