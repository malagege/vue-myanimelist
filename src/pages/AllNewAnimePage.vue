<template>
    <Header :udata="routeObj" @update:udata="replaceUrl($event)" />
    <div  class="position-relative">
        <div class="position-sticky text-center bg-white top-999"><h1>我的排名清單</h1></div>
        <MyAnimeList  v-model:items="selectedList" @changeHash="changeHash($event)"  /> 
    </div>
    <div  class="position-relative" v-for="anime in animeMenu" :key="anime.name">
        <div class="position-sticky text-center bg-white top-999" @click="getList(anime.name)"><h1>{{anime.label || anime.name}}</h1></div>
        <MyAnimeList v-if="anime.show"  v-model:items="allListObj[anime.name]" @changeHash="changeHash(anime.name,$event)" /> 
    </div>
</template>
<script>
import animeMenu from '../assets/animeMenu.json'
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
        parseHashData(hash = this.$route.hash){
            const value = (hash || '').slice(1)
            if(!value){
                return []
            }
            try{
                return JSON.parse(Base64.decode(value))
            }catch(e){
                console.error(e)
                return []
            }
        },
        applyUserDataToLists(udata, listNames = []){
            const targets = listNames.length ? listNames : this.animeMenu.map(anime => anime.name)
            targets.forEach(name => {
                (this.allListObj[name] || []).forEach(item => {
                    item.show = false
                    item.order = undefined
                })
            })
            udata.forEach(obj => {
                targets.forEach(name => {
                    let oitem = (this.allListObj[name] || []).find(item => item.name === obj.name)
                    if (oitem){
                        oitem.show = obj?.show
                        oitem.order = obj?.order
                    }
                })
            })
        },
        safeFileName(name){
            const target = this.animeMenu.find(obj => obj.name === name)
            const fileName = target?.file || target?.name
            const allowed = this.animeMenu.map(item => item.file || item.name)
            const safeName = allowed.includes(fileName) ? fileName : (allowed[0] || '')
            return encodeURIComponent(safeName)
        },
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
            
            const udata = this.parseHashData(routeObj.hash)

            if( this.openAnimeList ){
                let openList = this.openAnimeList.split(',').filter(Boolean)
                console.log(openList)
                openList.forEach(item => {
                    if(!this.allListObj[item]){
                        this.allListObj[item] = []
                    }
                    if(this.allListObj[item].length === 0){
                        this.getList(item)
                    }
                })

                // 還原新番資料
                this.applyUserDataToLists(udata, openList)
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
                if(!theAnimeMenu.length){
                    return false
                }
                const fileName = this.safeFileName(jsonpath)
                if(!fileName){
                    return false
                }
                theAnimeMenu[0].show = !theAnimeMenu[0]?.show
                console.log(JSON.parse(JSON.stringify(theAnimeMenu)))
            if((this.allListObj[jsonpath]?.length)){
                return false
            }
            axios.get(new URL(`../assets/${fileName}.json`, import.meta.url).href).then(res => {
                this.allListObj[jsonpath] = res.data
                // 取hash資料
                console.log('this.$route.hash.slice(1)',this.$route.hash.slice(1))
                const udata = this.parseHashData()
                this.applyUserDataToLists(udata,[jsonpath])
            }).catch(e=>console.log(e))
        }
    },
    mounted(){
        animeMenu.forEach(anime =>{
            this.allListObj[`${anime.name}`] = []
        })
        const openList = this.openAnimeList ? this.openAnimeList.split(',').filter(Boolean) : this.animeMenu.slice(0,2).map(anime => anime.name)
        openList.forEach(item => this.getList(item))
    },
}
</script>
<style scoped>
.top-999{
    top:0px; 
    z-index:999;
}
</style>
