<template>
  <div class="home">
   
    <form id="formtambahproduk">
    <div style="display:flex;" ><label class="bold" style="margin:auto; justify-content:center; ">Tambah Produk</label></div><br>
    <label class="fotoproduk">Foto Produk : </label>
    <div class="inputfoto">
    <input v-on:change="fototerpilih" type="file" id="inputfoto"/>
    </div>
    <div id="preview">
      <img v-if="url" :src="url" />
    </div>
    <label for="inputsku">SKU : </label>
    <input ref="sku" type="text" class="input"/>
    <label>Nama produk : </label>
    <input ref="namabarang" type="text" class="input" />
    <label>Harga produk : </label>
    <input ref="hargabarang" type="text" class="input" />
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
import { db, storage } from '../Firebase.js'

import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";



export default {
    data() {
        return {
        databarang : {sku: '', urlfoto: '', namabarang: '', hargabarang: ''},
        databarang2 : [],
        url : null,
        fotoproduk : ''
        }
    },
methods : {
        
        tambah() {
         
              //ambil file
            const file = document.getElementById('inputfoto').files[0];
            this.databarang.sku = this.$refs["sku"].value
            this.databarang.namabarang = this.$refs["namabarang"].value
            this.databarang.hargabarang = this.$refs["hargabarang"].value
                             
          
            if ( document.getElementById("inputfoto").files.length == 0 )
            {
                const docRef = doc(collection(db, "databarang")) 
                const data =  this.databarang        
                setDoc(docRef, data)
                document.getElementById('formtambahproduk').reset();
            }

            else {
              const metadata = file.type;
              const storage = getStorage();
              const storageRef = ref(storage, 'fotoproduk/' + file.name);
              // upload file
              const uploadsk = uploadBytesResumable(storageRef, file, metadata);
        
     
           uploadsk.on('stated', 
          
          (snapshot) => { 
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload is ' + progress + '% done');
                      switch (snapshot.state) {
                        case 'paused':
                          console.log('Upload is paused');
                          break;
                        case 'running':
                          console.log('Upload is running');
                          break;
                      }
            }, 
            erro => {
              // Handle unsuccessful uploads
            }, 
            success  => {
               getDownloadURL(uploadsk.snapshot.ref).then((downloadURL) => {
                console.log('File available at', downloadURL);
                this.databarang.urlfoto = downloadURL;
                
                const docRef = doc(collection(db, "databarang")); 
                const data = this.databarang
                setDoc(docRef, data)})  
                }) 
          
                document.getElementById('inputfoto').value = null,
                this.url=''
                this.$refs["sku"].value = null
                this.$refs["namabarang"].value = null
                this.$refs["hargabarang"].value = null
                                
                    
                 
    
            

    } 
             
              
           
    

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
        },

        fototerpilih(e) {
      const _fotoproduk = document.getElementById('inputfoto').files[0];
      this.url = URL.createObjectURL(_fotoproduk);
      this.fotoproduk = _fotoproduk

              
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
  display: block;
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

input.input {
  text-align: left;
  margin: auto;

  display: block;
  width: 100%;
  box-sizing: border-box;
  color: #555;
  border: none;
  border-bottom: 2px solid #ddd;
  padding: 10px 6px;
  font-size: 10px;
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
#preview {
  
  display: flex;
  justify-content: center;
  align-items: center;
}

#preview img {
  max-width: 100%;
  max-height: 100px;
}

.inputfoto{
  padding:10px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>