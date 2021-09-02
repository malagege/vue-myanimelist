<template>
    <nav class="navbar navbar-light bg-light">
    <div class="container justify-content-start">
        <a class="navbar-brand" href="#">
        <img src="https://getbootstrap.com/docs/5.0/assets/brand/bootstrap-logo.svg" alt="" width="30" height="24" class="d-inline-block align-text-top">
        我的新番清單
        </a>
        <ul class="navbar-nav mr-auto mb-2 me-auto mb-lg-0">
            <li class="nav-item">
                <select  class="form-select" v-if="jsonpath" v-model="selectAnimeYearMonth" @change="linkAnimeYearMonth($event)">
                    <option v-for="item in animeMenu" :key="item.name" :value="item.url">{{item.name}}</option>
                </select>
            </li>
            <li class="nav-item">
                <router-link to="/" class="nav-link" :class="{active: $route.path.match(/\/(\d+)/)}">月份清單</router-link>
            </li>
            <li class="nav-item">
                <router-link to="/all" class="nav-link" :class="{active: $route.path === '/all'}">每季清單</router-link>
            </li>
        </ul>
        <SettingManager :settingVar="udata" @update:settingVar="updateSettingVar($event)" :storageName="storageName"/>
    </div>
    </nav>
</template>
<script>
import animeMenu from '../assets/json/animeMenu.json'
import SettingManager from './SettingManager.vue'



export default {
    components:{
        SettingManager
    },
    props:{
        jsonpath: String,
        udata: Array,
    },
    data(){
        return {
            animeMenu
        }
    },
    computed:{
        selectAnimeYearMonth(){
            return '/' + this.jsonpath
        },
        storageName(){
            return this.$route.path.indexOf('/all')>=0 ? 'allItem' : 'MonthItem' ;
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
        },
        updateSettingVar(event){
            console.log(event)
            this.$emit('update:udata',event)
        }
    }
}
</script>
<style scoped>
.nav-link{
    padding-left: 8px;
    padding-left: 8px;
}

.navbar-nav{
    flex-direction: row;
}
</style>