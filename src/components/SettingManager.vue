<template>
    <a class="btn" data-bs-toggle="modal" data-bs-target="#exampleModal">
        <IconSetting></IconSetting>
    </a>
    <div class="modal fade bd-example-modal-lg" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true" id="exampleModal">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
        <h5 class="modal-title" id="exampleModalToggleLabel">設定</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="header d-flex">
                <div class="flex-grow-1">
                    <input class="form-input" type="text" placeholder="快速搜尋" v-model="searchText">
                    <button type="button" class="btn btn-light" @click="searchText =''">清空</button>
                </div>
                <button class="btn btn-primary">另存設定</button>
            </div>
            <hr>
            <div class="d-flex item">
                <span class="item-title">
                    title
                </span>
                <div>
                    <button class="btn btn-sm btn-secondary">
                        編輯名稱
                    </button>
                </div>
                <div>
                    <button class="btn btn-sm btn-info">
                        讀取設定
                    </button>
                </div>
                <div>
                    <button class="btn btn-sm btn-success">
                        覆蓋設定
                    </button>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger">
                        <IconTrashSharp></IconTrashSharp> 
                    </button>
                </div>

            </div>
        </div>
        <div class="modal-footer">
            <!-- <button class="btn btn-primary" data-bs-target="#exampleModalToggle2" data-bs-toggle="modal" data-bs-dismiss="modal">Open second modal</button> -->
        </div>
        </div>
    </div>
    </div>

</template>
<script>
import IconSetting from '~icons/icon-park-outline/setting-two'
import IconTrashSharp from '~icons/ion/trash-sharp'

export default {
    props:{
        settingVar: String,
        storageName:{
            type: String,
            default: 'saveItems'
        }
    },
    data(){
        return {
            searchText: ''
        }
    },
    components:{
        IconSetting,
        IconTrashSharp
    },
    methods:{
        alertHello(){
            alert('hello');
        }
    }
}

</script>
<style scoped>
.header{
    display: flex;
}
.item-title{
    flex: 1;

}
.item>*{
    padding: 12px 3px;
}
.item:hover{
    background: lightgray;
}
</style>