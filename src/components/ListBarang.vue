<template>


  <div class="home">
    
    <div v-for="data in databarang2" :key="data.sku" class="container-fluidz">
      <div class="thumbnail">
        <img :src=data.url>
      </div>
      <div class="tengah">
        <div class="namabarang">{{data.namabarang}}</div>
        <div class="hargabarang">Rp {{data.hargabarang}}</div>
      </div>
      <div class="kanan">
        <button class="kurang buttonTambah">-</button>
        <label class="jumlahbeli fontTambah">0</label>
        <button class="tambah buttonTambah">+</button>
      </div>
    </div>

    

    <div @click.prevent="ambil" class="buatpesanan">
      <p >Buat Pesanan</p>
    </div>

  
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
                                url:doc.data().urlfoto,
                                namabarang:doc.data().namabarang,
                                hargabarang:doc.data().hargabarang
                                });
                                });
            this.databarang2 = _databarang2;  
        }
  },
mounted() {
  this.ambil();
}
}
</script>

<style>
body {
  background-color : rgb(226, 225, 225);
}
.buatpesanan {
   box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  transition: 0.1s;
  display: FLEX;
  height: 80px;
  overflow:initial ;
  margin: 15px auto;
  border-radius: 5px;
  max-width: 600px;
  justify-content: center;
  display: flex;
  margin: auto;
  background-color: darkcyan;
  color: white;
  font-weight: bold;
}
.buatpesanan p {
    margin: auto;
    text-transform: uppercase;
    font-weight:bold;
}

.buatpesanan:hover {
  background-color: rgb(56, 194, 194);
}

.home {
  margin-bottom: 100px;
  justify-content: center;
  text-align: center;
  padding: 10px;
}
.container-fluidz {
  /* Add shadows to create the "card" effect */
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  transition: 0.1s;
  display: FLEX;
  height: 80px;
  overflow:initial ;
  margin: 15px auto;
  border-radius: 5px;
  max-width: 600px;
  background-color:white;
}

.thumbnail {
  background-color: #eee;
  display: flex;
  height: 100%;
  width: 80px;
  border-radius: 5px 0px 0px 5px;
  overflow:hidden;
  align-content: center;
}

.thumbnail img {
  min-height: 100%;
  min-width:100%;
  
  margin:auto;
  align-content: center;
  
}


.kanan {
  display: flex;
  height: 100%;
  width: 30%;
}

.buttonTambah {
  justify-content: center;
  height: 80%;
  align-items: center;
  width: 30px;
  margin: auto;
  border:none;
  background-color:darkcyan;
  font-weight:bold;
  color:white;
   border-radius:5px;
}
.buttonTambah:active{
  justify-content: center;
  height: 80%;
  align-items: center;
  width: 30px;
  margin: auto;
  border:none;
  background-color:cyan;
  transition: 0.1s;

}

.fontTambah {
  display: inline-block;
  font-size: 20px;
  margin: auto;
}

.urut {
  display: inline-block;
  background-color: aqua;
}

.tengah {
  display: table-cell;
  font-size: 2em;
  width: 60%;
  padding: 5px;
}

.hargabarang {
  display: flex;
  font-size: 15px;
  position: relative;
  top:-10px;
}

.namabarang {
  display: table-cell;
  vertical-align: top;
  font-size: 18px;
  font-weight: bold;
  text-align:left;
  line-height: 20px;
  height:50px;
  margin:auto;

}
</style>
