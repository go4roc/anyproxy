'use strict'

const {DataProvider} = require('../dataProvider');
const sequelize =  DataProvider.getInstance().sequelize;
const {RewriteModel} = require('../data/model/rewriteModel');
const {HttpsConfigModel} =  require('../data/model/httpsConfigModel');
const { OriginRecordModel } = require('../data/model/originRecordModel');
const {RemoteModel} = require('../data/model/remoteModel');
const {LocalMockModel} = require('../data/model/localMockModel');
const { ItemTableMap, HeaderOperationMap, ProxyRecordTypeMap } = require('../common/constant');
const {updateData, findData} = require('../data/dataUtils');

const datacore = require('./data.js'),
{rewrite_handler} = require('./proxyRewrite.js'),
{remote_handler} = require('./proxyRemote.js'),
{res_mock_handler} = require('./proxyLocalMock.js');

const req_type = {
    rewrite: 0,
    remote: 1,
    local_mock: 2
}


/**
 * 判断是否需要解析https
 * @param {*} requestDetail 
 */
const isDealHttps = async (requestDetail) =>{
    let isDeal = false;
    let query = {
        isDelete: false,
        domain: requestDetail.host.split(":")[0]
    };
    let result = await findData(HttpsConfigModel, query);
    if(result.length){
        isDeal = !!true;
    }
    return isDeal;
}

/**
 * 匹配请求地址和数据库中的拦截信息是否相同
 * @param {str} ori_req_url 拦截的请求地址
 * @param {sql_result_item} obj 数据库中的数据
 */
const matchUrl= (ori_req_url,obj) =>{
    if(!ori_req_url.toUpperCase().includes(obj.urlDomain.toUpperCase())) return false; //如果不是同一个domain，就直接返回false
    let i_req_url = obj.reqUrl;
    let r1 = new RegExp('\\*','ig');
    i_req_url = i_req_url.replace(r1,'.*');
    var re = new RegExp(i_req_url,'ig');
    if(re.test(ori_req_url)) return true;
    return false;
}


const switchReqType = async (requestDetail, isReqData, remoteIP)=>{
    let req_domain = requestDetail.host.split(":")[0];
    let ruleModelList = [RewriteModel];
    if(isReqData){
        ruleModelList.push(RemoteModel);
        ruleModelList.push(LocalMockModel);
    }
    let base_query = {
        urlDomain: req_domain,
        isDelete: false,
    }
    for(let ModelObj of ruleModelList){
        let result = null;
        if(ModelObj === sequelize.models.RewriteModel){
            base_query.isReqData = isReqData;
            result = await findData(ModelObj, base_query);
            delete base_query.isReqData;
        }else{
            result = await findData(ModelObj, base_query);
        }
        if(result.length){
            for(ruleObj of result){
                if(!ruleObj.isLimitIP || ruleObj.IP.contains(remoteIP)){
                    if(matchUrl(requestDetail.url, ruleObj)){
                        return {ModelObj, ruleObj}
                    }
                }
            }
        }
        
    }
    return {ModelObj: -1, ruleObj: -1};
}

/**
 * 处理请求信息：rewrite，remote，local_mock
 * @param {} requestDetail 
 * @param {} remoteIP
 */
 const resolveRequest = async (requestDetail,remoteIP) =>{
    let {ModelObj, ruleObj} = await switchReqType(requestDetail, true, remoteIP);
    if(ModelObj===-1) return(requestDetail);
    switch(ModelObj){
        case sequelize.models.RewriteModel: {
            rewrite_handler(requestDetail, ruleObj);
            break;
        }       
        case sequelize.models.RemoteModel: {
            remote_handler(requestDetail, ruleObj);
            break;
        }
        case sequelize.models.LocalMockModel: {
            requestDetail = res_mock_handler(requestDetail, ruleObj);
            break;
        }
    }
    console.log('requestDetail---2 = ',requestDetail);
    return requestDetail;
 
 }

 const resolveResponse = async(requestDetail, responseDetail, remoteIP) =>{
    let {ModelObj, ruleObj} = await switchReqType(requestDetail, false, remoteIP);
    if(ModelObj===-1) return responseDetail;
    switch(type.id){
        case sequelize.models.RewriteModel: {
            rewrite_handler(requestDetail, ruleObj, responseDetail);
            break;
        }
    }
    return responseDetail;
 }

// isDealHttps();
// resolveRequest();
// switchReqType();

module.exports={
    isDealHttps,
    resolveRequest,
    resolveResponse
}