<template>
  <router-view></router-view>
  <AppFooter></AppFooter>
</template>

<script>
import "bootstrap/dist/css/bootstrap.min.css"
import 'bootstrap'
import AppFooter from './components/AppFooter.vue'

export default {
  components: {
    AppFooter,
  },
}
</script>
