<template>
    <h1>Kasirboy</h1>
    <transition name="slide-fade">
    <div v-show="kasirs"><ListBarang /></div>
     </transition> 
     <transition name="slide-fade">
    <div v-show="tambahdatas"><TambahBarang /></div>
     </transition> 
    <Navbar @TambaB="tambahdata" @kasirS="kasir" />
   
 
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import TambahBarang from './components/TambahBarang.vue'
import ListBarang from './components/ListBarang.vue'
import Navbar from './components/Navbar.vue'
import {app} from './Firebase'

export default {
  name: 'App',
  components: {
    HelloWorld,
    TambahBarang,
    ListBarang,
    Navbar
  },
  data() {
    return {
      kasirs : true,
      tambahdatas : false
  }
  },
  methods: {
    kasir() {
      this.kasirs = true;
      this.tambahdatas = false
    },
    tambahdata() {
      this.kasirs = false;
      this.tambahdatas = true
    }
  }
}
</script>



<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
body {
  margin:0;
}

.slide-fade-enter-active {
  transition: all 1s ease;
}

.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(1000px);
  opacity: 10;
}

</style>
