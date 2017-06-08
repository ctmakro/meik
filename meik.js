// this routine(TypeScript) helps to inherit static methods
var __extends = (this && this.__extends) || function (d, b) {
  for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __extends = function(d,b){
  for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
}

var make = (()=>{
  var _make = parent => populator => {
    var nc = function(){if(this.init)this.init.apply(this,arguments)}

    var proto = {}
    if(typeof populator==='function'){
      populator(proto, parent.prototype)
    }else{
      // Object.assign(proto, populator)
      proto = populator
    }
    proto.__proto__ = parent.prototype
    nc.prototype = proto

    __extends(nc,parent)
    return nc
  }
  Function.prototype.make = function(p){ // now Class.make() is possible
    return _make(this)(p)
  }
  Function.prototype.setp = function(o){return Object.assign(this,o)}
  var make = _make(function(){})
  return make
})()

module.exports = make
var assert = (cond,msg)=>{
  if(!cond)
  throw 'assert failed'+(msg?': '+msg.toString():"")
}
function tests(){
  // baseclass
  var Animal = make(p=>{
    p.init = function () { // use init() as constructor that allows fallback
      this.legs = 4
    }
    p.say = function(){
      return this.sound
    }
  })
  // static methods
  Animal.kill = (ani)=>ani.sound+'...bang!'

  // baseclass, in another flavor
  var Animal2 = make({
    init(){
      this.legs = 4
    },
    say(){
      return this.sound
    }
  })
  assert(new Animal2().legs===4)

  // inherit + override
  var Sheep = Animal.make((p,s)=>{
    p.init = function(){
      s.init.call(this)
      this.sound = 'baa'
    }
  })
  assert(new Sheep().say()==='baa')

  // mixin
  var AngryMixin = p=>{
    p.say = function(){
      return this.sound+'!!!';
    }
  }

  var AngrySheep = Sheep.make(AngryMixin)
  assert(new AngrySheep().say(),'baa!!!')

  // getter setter
  var RunningAnimal = Animal.make({
    get speed(){return this.legs * 10},
    set speed(x){this.legs = x / 10}
  })
  assert(new RunningAnimal().speed===40)

  // getter setter, another flavor
  var RunningAnimal = Animal.make(p=>{
    Object.defineProperty(p,'speed',{
      get(){return this.legs * 10},
      set(x){this.legs = x/10}
    })
  })
  assert(new RunningAnimal().speed===40)

  var Dog = RunningAnimal.make((p,s)=>{
    p.init = function(){
      s.init.call(this)
      this.sound = 'bark'
    }
  })
  var d = new Dog()
  assert(d.speed===40)
  assert(d.say()==='bark')

  assert(Dog.kill(d)==='bark...bang!')
}
tests()
