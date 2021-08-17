<template>
    <div class="container">
        <div class="myanimelist">
            <!-- [v-for 循环时直接使用v-model绑定value报错 - 简书](https://www.jianshu.com/p/947b2aa0cd8c) -->
            <MyAnimeListItem v-for="(item,i) in items" v-model:item="items[i]" :key="item.img" @update:item="udata($event)"/>
        </div>
    </div>

</template>
<script>
import MyAnimeListItem from './MyAnimeListItem.vue'
import axios from 'axios'
import json from '../../src/assets/json/AnimeMenu.json'

export default{
    props:{
        jsonpath: String
    },
    components: {
        MyAnimeListItem
    },
    data(){
        return {
            items:[],
            userData:[]
        }
    },
    mounted(){
        console.log(this.jsonpath)
        let selected = json.find((obj)=> obj.url === ('/'+this.jsonpath) ) || json[0]
        console.log(selected)
        axios.get(`src/assets/json/${selected.name}.json`).then(res => {
            this.items = res.data
            // 取hash資料
            let udata = JSON.parse(this.$route.hash.substr(1))
            udata.forEach(obj => {
                let oitem = this.items.find(item => item.name === obj.name)
                if (oitem){
                    oitem.show = obj?.show
                    oitem.order = obj?.order
                }
            });
        })


    },
    methods:{
        udata(){
            console.log('test')
            let userSelectedAnime = this.items.filter(item => item.show === true || item.order > '0')
            this.userData = userSelectedAnime.map(item => {
                let{ name, show, order } = item
                return {
                    name,
                    show,
                    order
                }
            })
            this.$router.replace({hash: '#'+JSON.stringify(this.userData)})
            return this.userData
        }
    },
    async beforeRouteUpdate(to, from) {
        // 對路由變化做出響應...
        // this.userData = await fetchUser(to.params.id)
        if( to.path === from.path ) return true
        console.log('to',to,'from',from);
        let selected = json.find((obj)=> obj.url === ('/'+to.params.jsonpath) ) || json[0]
        axios.get(`src/assets/json/${selected.name}.json`).then(res => this.items = res.data)
    },
}
</script>
<style scoped>
.myanimelist{
    display: grid;
    grid-template-columns: repeat(4, 1fr)
}

/* [css - Flex-box: Align last row to grid - Stack Overflow](https://stackoverflow.com/questions/18744164/flex-box-align-last-row-to-grid) */
/* .myanimelist::after{
    content: "";
    flex: auto;
} */
</style>