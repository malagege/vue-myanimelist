<template>
    <Header :jsonpath="jsonpath" />
    <MyAnimeList v-model:items="items"  @changeHash="changeHash($event)"/>
</template>
<script>
import animeMenu from '../assets/json/AnimeMenu.json'
import {Base64} from 'js-base64'
import Header from '../components/Header.vue'
import MyAnimeList from '../components/MyAnimeList.vue'
import axios from 'axios'
export default {
    props:{
        jsonpath:String
    },
    components:{
        Header,MyAnimeList
    },
    data(){
        return{
            items:[],
            udata:[]
        }
    },
    methods:{
        changeHash(ent){
            console.log('ent',ent)
            this.$router.replace({hash: '#'+Base64.encodeURL(ent)})
        }
    },
    mounted(){
        let selected = animeMenu.find((obj)=> obj.url === ('/'+this.jsonpath) ) || animeMenu[0]
        console.log('selected',selected)
        axios.get(`src/assets/json/${selected.name}.json`).then(res => {
            this.items = res.data
            // 取hash資料
            console.log('this.$route.hash.substr(1)',this.$route.hash.substr(1))
            let udata = JSON.parse(Base64.decode(this.$route.hash.substr(1)))
            udata.forEach(obj => {
                let oitem = this.items.find(item => item.name === obj.name)
                if (oitem){
                    oitem.show = obj?.show
                    oitem.order = obj?.order
                }
            });
        }).catch(e=>console.log(e))
    },
    async beforeRouteUpdate(to, from) {
        // 對路由變化做出響應...
        // this.userData = await fetchUser(to.params.id)
        // try {
        //     let udata = JSON.parse(this.$route.hash.substr(1))
        //     udata.forEach(obj => {
        //         let oitem = this.items.find(item => item.name === obj.name)
        //         if (oitem){
        //             oitem.show = obj?.show
        //             oitem.order = obj?.order
        //         }
        //     });
        // } catch (error) {
        //     console.log(error)
        // }
        if( to.path === from.path ) return true
        console.log('to',to,'from',from);
        let selected = animeMenu.find((obj)=> obj.url === ('/'+to.params.jsonpath) ) || animeMenu[0]
        axios.get(`src/assets/json/${selected.name}.json`).then(res => {
            this.items = res.data
            // 取hash資料
            console.log('this.$route.hash.substr(1)',this.$route.hash.substr(1))
            let udata = JSON.parse(Base64.decode(this.$route.hash.substr(1)))
            udata.forEach(obj => {
                let oitem = this.items.find(item => item.name === obj.name)
                if (oitem){
                    oitem.show = obj?.show
                    oitem.order = obj?.order
                }
            });
        }).catch(e=>console.log(e))
    },
}
</script>
<style scoped>

</style>