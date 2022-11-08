<template>
    <div class="myAnimeListItem"
        @click="toggle($event)" 
        @contextmenu="orderItem($event)" 
        :style="{order: item.order}"
        :data-order="item.order"
    >
        <div class="cancel" :class="{hidden: item.show}"></div>
        <div class="myAnimeListItem__name" :class="{ fontSmall: stringBytes(item?.name) >= 22 }"><div class="myAnimeListItem__nameText">{{item.name}}</div></div>
        <div class="flex">
            <img class="myAnimeListItem__animeImg" :src="item.img" referrerpolicy="no-referrer" >
            <pre class="myAnimeListItem__staff">
                {{item.staff||item.description}}
            </pre>
        </div>
    </div>
</template>
<script>

export default {
    props:{
        item: Object
    },
    emits: ['update:item'],
    methods:{
        toggle(ent){
            // console.log(ent)
            this.item.show = !!!this.item.show
            this.$emit('update:item', this.item)
        },
        orderItem(event){
            this.item.order = prompt(`請輸入「${this.item.name}」動畫名次`)
            event.preventDefault(); 
            this.$emit('update:item', this.item)
        },
        // 中文長度 2Byte 參考:https://www.puritys.me/docs-blog/article-107-String-Length-%E4%B8%AD%E6%96%87%E5%AD%97%E4%B8%B2%E9%95%B7%E5%BA%A6.html
        stringBytes(c){
            var n = c.length,s;
            var len = 0;
            for(var i = 0; i <n;i++){
                s = c.charCodeAt(i);
                while( s > 0 ){
                    len++;
                    s = s >> 8;
                }
            }
            return len;
        }
    }
}
</script>
<style scoped>

.myAnimeListItem .cancel.hidden{
    /* display: none; */
    bottom: 100%
}
.flex{
    display: flex;
}

.myAnimeListItem{
    min-width: 275px;
    height: 250px;
    position: relative;
    cursor: pointer;
    order: 999;
}

.myAnimeListItem::before{
  content: attr(data-order);
  color:tomato;
  background:rgba(0, 0, 0, .7);
  font-weight: bold;
  font-size: 3rem;
  line-height: 1;
  position: absolute;
  right: 20px;
  bottom: 10px;
}

.myAnimeListItem .cancel{
    top:0px;
    left:0px;
    right: 0px;
    bottom: 0px;
    transition: bottom .5s ;
    position: absolute;
    background: black;
    opacity: 0.45;
    pointer-events: none;
}

.myAnimeListItem__name{
    background: black;
    color: white;
    display: grid;
    justify-content: center;
    align-items: center;
    height: 50px;
    /* text-align: center; */
    font-size: 1.4em;
}

.myAnimeListItem__nameText{
    padding: 0px 8px;
}


.myAnimeListItem__name.fontSmall{
    font-size: 1.1em;
}

.myAnimeListItem__animeImg{
    flex: 1;
    width: 50%;
    height: 200px;
    object-fit: cover;
}

.myAnimeListItem__animeImg img{
    width: 100%;
}

.myAnimeListItem__staff{
    flex: 1;
    width: 50%;
    background-color: rgb(192,192,192);
    white-space: pre-line;
    padding: 5px 5px 5px 5px;
    word-break: break-all;
    color: black;
    font-size: 13px;
    overflow: auto;
    height: 200px;
    overflow: hidden;
}

* {
    box-sizing: border-box;
}
</style>