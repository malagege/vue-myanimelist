<template>
    <nav class="navbar navbar-light bg-light">
    <div class="container justify-content-start">
        <a class="navbar-brand" href="#">
        <img src="https://getbootstrap.com/docs/5.0/assets/brand/bootstrap-logo.svg" alt="" width="30" height="24" class="d-inline-block align-text-top">
        我的新番清單
        </a>
        <div id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
            <button class="btn">說明</button>
        </li>
        <li>
            <select v-if="jsonpath" v-model="selectAnimeYearMonth" @change="linkAnimeYearMonth($event)">
                <option v-for="item in AnimeMenu" :key="item.name" :value="item.url">{{item.name}}</option>
            </select>
        </li>
        </ul>
        </div>
    </div>
    </nav>
</template>
<script>
import AnimeMenu from '../assets/json/AnimeMenu.json'


export default {
    props:{
        jsonpath: String
    },
    data(){
        return {
            AnimeMenu
        }
    },
    computed:{
        selectAnimeYearMonth(){
            return '/' + this.jsonpath
        }
    },
    methods:{
        linkAnimeYearMonth(event){
            console.log(event.target.value)
            this.$router.push({
                path: event.target.value
            }).catch((err) => {
                throw new Error(`Problem handling something: ${err}.`);
            });
            console.log('test')
        }
    }
}
</script>
<style scoped>

</style>