<template>
  <Header />
  <MyAnimeList />
</template>

<script>
import Header from './components/Header.vue'
import MyAnimeList from './components/MyAnimeList.vue'
import HelloWorld from './components/HelloWorld.vue'
import "bootstrap/dist/css/bootstrap.min.css"
import 'bootstrap'
export default{
  components:{
    Header,MyAnimeList,HelloWorld
  }
}
// This starter template is using Vue 3 experimental <script setup> SFCs
// Check out https://github.com/vuejs/rfcs/blob/master/active-rfcs/0040-script-setup.md
</script>

<style>

</style>
