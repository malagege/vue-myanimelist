<template>
  <router-view></router-view>
  <Footer></Footer>
</template>

<script>
import "bootstrap/dist/css/bootstrap.min.css"
import 'bootstrap'
import Footer from './components/Footer.vue'
export default{
  props: {
    jsonpath: String
  },
  components:{
    Footer
  }
}
// This starter template is using Vue 3 experimental <script setup> SFCs
// Check out https://github.com/vuejs/rfcs/blob/master/active-rfcs/0040-script-setup.md
</script>

<style>

</style>
