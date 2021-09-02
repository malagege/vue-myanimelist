<template>
    <Header :udata="routeObj" @update:udata="replaceUrl($event)" />
    <div  class="position-relative">
        <div class="position-sticky text-center bg-white top-999"><h1>我的排名清單</h1></div>
        <MyAnimeList  v-model:items="selectedList" @changeHash="changeHash($event)"  /> 
    </div>
    <div  class="position-relative" v-for="anime in animeMenu" :key="anime.name">
        <div class="position-sticky text-center bg-white top-999" @click="getList(anime.name)"><h1>{{anime.name}}</h1></div>
        <MyAnimeList v-if="anime.show"  v-model:items="allListObj[anime.name]" @changeHash="changeHash(anime.name,$event)" /> 
    </div>
</template>
<script>
import animeMenu from '../assets/json/animeMenu.json'
import {Base64} from 'js-base64'
import Header from '../components/Header.vue'
import MyAnimeList from '../components/MyAnimeList.vue'
import axios from 'axios'
export default {
    props:{
        openAnimeList:String
    },
    components:{
        Header,MyAnimeList
    },
    data(){
        return{
            allListObj:{},
            animeMenu
        }
    },
    computed:{
        routeObj(){
            let path = this.$route.path
            let hash = this.$route.hash
            return {
                path,
                hash
            }
        },
        selectedList(){
            let items = [];
            this.animeMenu.forEach(anime =>{
                console.log('selectedList()',this.allListObj[anime.name])
                console.log('anime.name', anime.name)
                let selectedItems  = this.allListObj[anime.name]?.filter( (obj)=> obj?.show || obj?.order )
                if(selectedItems){
                    items.push(...selectedItems)
                }
            })
            console.log('selectedList::items',items)
            // items = JSON.parse(JSON.stringify(items))
            return items
        },
        urlAnimeList(){
            let openAnimeList = []
            animeMenu.forEach(anime => {
                if(this.allListObj[anime.name]?.length ){
                    openAnimeList.push(anime.name)
                }
            })
            return openAnimeList.join(',')
        },
    },
    methods:{
        changeHash(jsonpath, dataJson){
            console.log('dataJson',dataJson)
            // this.allListObj[jsonpath] = JSON.parse(dataJson)
            let selectedListLess =  this.selectedList.map( s => {
                let { name,show,order} =  s
                return {
                    name,
                    show,
                    order
                }
                
            })
            this.$router.replace({
                path: `/all/${this.urlAnimeList}`,
                hash: '#'+Base64.encodeURL(JSON.stringify(selectedListLess))
            })
        },
        replaceUrl(routeObj){
            console.log(routeObj)
            this.$router.replace({
                path: routeObj.path,
                hash: routeObj.hash
            })
            
            if( this.openAnimeList ){
                let openList = this.openAnimeList.split(',')
                console.log(openList)
                openList.forEach(item => {
                    if(this.allListObj[item].length === 0){
                        this.getList(item)
                    }
                })

                // 還原新番資料
                animeMenu.forEach(anime =>{
                    this.allListObj[`${anime.name}`].forEach( item => delete item.show && delete item.order )
                })
                
                let udata = JSON.parse(Base64.decode(this.$route.hash.substr(1)))
                udata.forEach(obj => {
                    openList.forEach((name)=>{
                        let oitem = this.allListObj[name].find(item => item.name === obj.name)
                        if (oitem){
                            oitem.show = obj?.show
                            oitem.order = obj?.order
                        }
                    })
                })
            }

            // let udata = JSON.parse(Base64.decode(this.$route.hash.substr(1)))
            // udata.forEach(obj => {
            //     let oitem = this.allListObj[jsonpath].find(item => item.name === obj.name)
            //     if (oitem){
            //         oitem.show = obj?.show
            //         oitem.order = obj?.order
            //     }
            // });
        },
        getList(jsonpath){
            console.log('jsonpath',jsonpath)
                // 實作縮放
                let theAnimeMenu = this.animeMenu.filter( (obj) => obj.name === jsonpath )
                theAnimeMenu[0].show = !theAnimeMenu[0]?.show
                console.log(JSON.parse(JSON.stringify(theAnimeMenu)))
            if((this.allListObj[jsonpath]?.length)){
                return false
            }
            axios.get(`src/assets/json/${jsonpath}.json`).then(res => {
                this.allListObj[jsonpath] = res.data
                // 取hash資料
                console.log('this.$route.hash.substr(1)',this.$route.hash.substr(1))
                console.log(Base64.decode(this.$route.hash.substr(1)))
                let udata = JSON.parse(Base64.decode(this.$route.hash.substr(1)))
                udata.forEach(obj => {
                    let oitem = this.allListObj[jsonpath].find(item => item.name === obj.name)
                    if (oitem){
                        oitem.show = obj?.show
                        oitem.order = obj?.order
                    }
                });
            }).catch(e=>console.log(e))
        }
    },
    mounted(){
        animeMenu.forEach(anime =>{
            this.allListObj[`${anime.name}`] = []
        })
        if( this.openAnimeList ){
            let openList = this.openAnimeList.split(',')
            console.log(openList)
            openList.forEach(item => this.getList(item))
        }else{
            console.log(animeMenu[0].name)
            this.getList(animeMenu[0].name)
            console.log(animeMenu[1].name)
            this.getList(animeMenu[1].name)
        }
    },
}
</script>
<style scoped>
.top-999{
    top:0px; 
    z-index:999;
}
</style>