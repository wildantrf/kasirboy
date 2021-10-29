<template>
  <div class="home">
   
    <form>
    <div style="display:flex;" ><label class="bold" style="margin:auto; justify-content:center; ">Input Produk</label></div><br>
    <label for="inputsku">SKU : </label>
    <input v-model="databarang.sku" type="text" class="inputsku"/>
    <label>Nama item : </label>
    <input v-model="databarang.namabarang" type="text" class="inputnama" />
    <label>Harga item : </label>
    <input v-model="databarang.hargabarang" type="text" class="inputharga" />
    <button @click.prevent="tambah" class="input">Tambahkan produk</button>
    
  </form>
  </div>

  <div v-for="data in databarang2" :key="data.sku" style="border:solid;">
      <div>SKU : {{data.sku}}</div><br>
      <div>Nama Barang : {{data.namabarang}}</div><br>
      <div>Harga Barang : {{data.hargabarang}}</div><br>
  </div>



</template>

<script>
import { db } from '../Firebase.js'

import { collection, doc, setDoc, getDocs } from "firebase/firestore"; 



export default {
    data() {
        return {
        databarang : {sku: '', namabarang: '', hargabarang: ''},
        databarang2 : []   
        }
    },
methods : {
        async tambah(event) {
            event.preventDefault();
            const docRef = await doc(collection(db, "databarang")); 
            const data = {
                        sku: this.databarang.sku,
                        namabarang: this.databarang.namabarang,
                        hargabarang: this.databarang.hargabarang
                        };
            setDoc(docRef, data);
            console.log(this.databarang.sku);
        },
    
        async ambil() {
            let _databarang2 = [];
            const querySnapshot = await getDocs(collection(db, "databarang"));
            querySnapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            console.log(this.databarang2);
            
            _databarang2.push({ 
                                sku:doc.data().sku, 
                                namabarang:doc.data().namabarang,
                                hargabarang:doc.data().hargabarang
                                });
                                });
            this.databarang2 = _databarang2;  
        }
    }
}
</script>

<style scoped>

form {
  max-width: 420px;
  margin: 30px auto;
  background: white;
  text-align: left;
  padding: 40px;
  border-radius: 10px;
  font-size: 15px;
  max-width:300px;
  
}
label {
  display: inline-block;
  margin: 15px 0 0px;
  letter-spacing: 1px;

  text-transform: uppercase;
}
label.bold {
  display: inline-block;
  margin: 15px 0 0px;
  letter-spacing: 1px;
  font-weight:bold;
  text-transform: uppercase;
  font-size:20px;
}
input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  color: #555;
  border: none;
  border-bottom: 2px solid #ddd;
  padding: 10px 6px;
  font-size: 10px;
}
.inputbarang {
  text-align: left;
  margin: auto;
  display: flex;
}

button {
  justify-content: center;
  text-align: center;
  margin: 20px auto;
  background-color: darkcyan;
  color: white;
  font-weight: bold;
  display: block;
  width: 80%;
  height: 50px;
  text-transform: uppercase;
  font-size: 15px;
}
</style>