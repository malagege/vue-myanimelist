<template>
    <Header :jsonpath="jsonpath" :udata="selectList" @update:udata="changeHash2($event)" />
    <MyAnimeList v-model:items="items"  @changeHash="changeHash($event)"/>
</template>
<script>
import animeMenu from '../assets/json/animeMenu.json'
import {Base64} from 'js-base64'
import Header from '../components/Header.vue'
import MyAnimeList from '../components/MyAnimeList.vue'
import axios from 'axios'
export default {
    props:{
        jsonpath:String
    },
    // watch:{
    //     selectList(){
    //         console.log('this.selectList',this.selectList)
    //         this.changeHash((JSON.stringify(this.selectList)))
    //         this.items.forEach( item => delete item.show && delete item.order )
    //         this.selectList.forEach(obj => {
    //             let oitem = this.items.find(item => item.name === obj.name)
    //             if (oitem){
    //                 oitem.show = obj?.show
    //                 oitem.order = obj?.order
    //             }
    //         });
    //     }
    // },
    components:{
        Header,MyAnimeList
    },
    data(){
        return{
            items:[],
            selectList:[]
            // udata:[]
        }
    },
    methods:{
        changeHash(ent){
            console.log('ent',ent)
            this.selectList = JSON.parse(ent)
            this.$router.replace({hash: '#'+Base64.encodeURL(ent)})
        },
        changeHash2(ent){
            console.log('ent',ent)
            this.$router.replace({hash: '#'+Base64.encodeURL(JSON.stringify(ent))})
        },
    },
    mounted(){
        let selected = animeMenu.find((obj)=> obj.url === ('/'+this.jsonpath) ) || animeMenu[0]
        console.log('selected',selected)
        axios.get(`src/assets/json/${selected.name}.json`).then(res => {
            this.items = res.data
            // 取hash資料
            console.log('this.$route.hash.substr(1)',this.$route.hash.substr(1))
            let udata = JSON.parse(Base64.decode(this.$route.hash.substr(1)))
            this.selectList = udata
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
        if( to.path === from.path ) {
            // if(to.hash.substr(1) !== from.hash.substr(1) && to.hash.substr(1) &&  from.hash.substr(1) ){
            //     let udata = JSON.parse(Base64.decode(to.hash.substr(1)))
            //     this.selectList = udata
            // }
            try{
            this.items.forEach( item => delete item.show && delete item.order )
            let udata = JSON.parse(Base64.decode(to.hash.substr(1)))
            // this.selectList = udata
            udata.forEach(obj => {
                let oitem = this.items.find(item => item.name === obj.name)
                if (oitem){
                    oitem.show = obj?.show
                    oitem.order = obj?.order
                }
            });
            }catch(e){
                console.error(e)
            }
            return true
        }
        console.log('to',to,'from',from);
        let selected = animeMenu.find((obj)=> obj.url === ('/'+to.params.jsonpath) ) || animeMenu[0]
        axios.get(`src/assets/json/${selected.name}.json`).then(res => {
            this.items = res.data
            // 取hash資料
            console.log('this.$route.hash.substr(1)',this.$route.hash.substr(1))
            let udata = JSON.parse(Base64.decode(this.$route.hash.substr(1)))
            // this.selectList = udata
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