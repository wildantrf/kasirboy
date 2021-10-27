<template>
  <button @click.prevent="tambah">tambah</button>
</template>

<script>
import { db } from '../Firebase.js'

import { collection, addDoc } from "firebase/firestore"; 


export default {
methods : {
    tambah() {
        
        // const docRef = 
        addDoc(collection(db, "cities"), {
        name: "Tokyo",
        country: "Japan"
        });
        // console.log("Document written with ID: ", docRef.id);

  }

}}
</script>

<style>

</style>