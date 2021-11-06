<template>
  <div class="navbarb">
    <div class="navbarcontainer">
     
      <div @click.prevent="Kasir" class="navbarbutton">
      <a href="">Kasir</a>
      </div>
      <div class="navbarbutton">
      <a >Pesanan</a>
      </div>
      <div class="navbarbutton">
      <a >Pesanan Selesai</a>
      </div>
       <div @click.prevent="TambahBarang" class="navbarbutton">
        <a href="">Manajemen Produk</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods : {
    TambahBarang() {
      this.$emit('TambaB','Asa')
    },
    Kasir() {
      this.$emit('kasirS','Asa')
    }
  }
};
</script>

<style scoped>

.navbarcontainer {
  display:flex;
  margin:auto;
  text-align:center;

}
.navbarb {
  display:flex;
  background-color: darkcyan;
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 80px;
  text-align: center;
  justify-content: center;
  vertical-align: middle;
  margin:auto;
}

a {
 
  font-weight: bold;
  color:white;
  width: 100%;
  height: 80px;
  padding: 10px;
  margin:auto;
}
</style>
