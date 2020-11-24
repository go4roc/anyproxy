/**
 * The panel to display the detial of the record
 *
 */

import React, { PropTypes } from 'react';
import ClassBind from 'classnames/bind';
import { Menu, Table, notification, Spin, Button,Input } from 'antd';
import clipboard from 'clipboard-js'
import JsonViewer from 'component/json-viewer';
import ModalPanel from 'component/modal-panel';
import { hideRecordDetail } from 'action/recordAction';
import { selectText } from 'common/commonUtil';
import { curlify } from 'common/curlUtil';

import Style from './record-detail.less';
import CommonStyle from '../style/common.less';
import text from 'body-parser/lib/types/text';
import TextArea from 'antd/lib/input/TextArea';

const StyleBind = ClassBind.bind(Style);

const EditStyle = StyleBind('liItem',{editLiItem:true});
const PageIndexMap = {
  REQUEST_INDEX: 'REQUEST_INDEX',
  RESPONSE_INDEX: 'RESPONSE_INDEX'
};
const add_btn_style=StyleBind('btn',{add_btn:true});

// the maximum length of the request body to decide whether to offer a download link for the request body
const MAXIMUM_REQ_BODY_LENGTH = 10000;

class RecordRequestDetail extends React.Component {
  constructor() {
    super();
    this.state = {
      isEdit:false
    };

    this.copyCurlCmd = this.copyCurlCmd.bind(this);
  }

  static propTypes = {
    requestRecord: PropTypes.object,
    onChange:PropTypes.func,
    onAddHeader:PropTypes.func,
    isEdit:PropTypes.bool
  }
  componentWillReceiveProps(nextProps){
    // console.log('77777777777777777777777777'); //组件调用2次，这个方法只执行一次，没明白原因
    // console.log(nextProps);
    this.setState({
      isEdit:nextProps.isEdit||false
    });
  }

  onSelectText(e) {
    selectText(e.target);
  }

  getLiDivs(targetObj) {
    let dataType = this.props.recordDetail.isEdit?1:0;
    let pos=-1;
    const liDom = Object.keys(targetObj).map((key) => {
      targetObj[key]==''?pos++:null;
      return (
        <li key={key} className={this.props.isEdit?EditStyle:Style.liItem} >
          { targetObj[key]==''?<strong><Input name={`${pos}-default`} style={{'width':'50px'}} onChange={this.props.onChange}></Input> : </strong>:<strong>{key} : </strong>}
          {this.props.isEdit? <span><Input defaultValue={targetObj[key]} onChange={this.props.onChange} 
            name={`${dataType}-${key}`} /></span>:
            <span>{targetObj[key]}</span>}          
        </li>
      );
    });

    return liDom;
  }

  getCookieDiv(cookies) {
    let cookieArray = [];
    if (cookies) {
      const cookieStringArray = cookies.split(';');
      cookieArray = cookieStringArray.map((cookieString) => {
        const cookie = cookieString.split('=');
        return {
          name: cookie[0],
          value: cookie.slice(1).join('=') // cookie的值本身可能含有"=", 此处进行修正
        };
      });
    } else {
      return <div className={Style.noCookes}>No Cookies</div>;
    }
    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        width: 300
      },
      {
        title: 'Value',
        dataIndex: 'value'
      }
    ];

    const rowClassFunc = function (record, index) {
      // return index % 2 === 0 ? null : Style.odd;
      return null;
    };

    const locale = {
      emptyText: 'No Cookies'
    };

    return (
      <div className={Style.cookieWrapper} >
        <Table
          columns={columns}
          dataSource={cookieArray}
          pagination={false}
          size="middle"
          rowClassName={rowClassFunc}
          bordered
          locale={locale}
          rowKey="name"
        />
      </div>
    );
  }

  getReqBodyDiv() {
    // console.log(this.props);
    const recordDetail  = this.props.recordDetail;
    const requestBody = recordDetail.reqBody;

    const reqDownload = <a href={`/fetchReqBody?id=${recordDetail.id}&_t=${Date.now()}`} target="_blank">download</a>;
    const getReqBodyContent = () => {
      const bodyLength = requestBody.length;
      if (bodyLength > MAXIMUM_REQ_BODY_LENGTH) {
        return reqDownload;
      } else {
        return <div>{requestBody}</div>
      }
    }

    return (
      <div className={Style.reqBody} >
        {getReqBodyContent()}
      </div>
    );
  }

  notify(message, type = 'info', duration = 1.6, opts = {}) {
    notification[type]({ message, duration, ...opts })
  }

  copyCurlCmd() {
    const recordDetail = this.props.recordDetail
    clipboard
      .copy(curlify(recordDetail))
      .then(() => this.notify('COPY SUCCESS', 'success'))
      .catch(() => this.notify('COPY FAILED', 'error'))
  }

  getRequestDiv() {
    const recordDetail = this.props.recordDetail;
    const reqHeader = Object.assign({}, recordDetail.reqHeader);
    const cookieString = reqHeader.cookie || reqHeader.Cookie;
    delete reqHeader.cookie; // cookie will be displayed seperately

    const { protocol, host, path } = recordDetail;
    console.log('isEdit: ---> ',this.state.isEdit);
    return (
      <div>
        <div className={Style.section} >
          <div >
            <span className={CommonStyle.sectionTitle}>General</span>
          </div>
          <div className={CommonStyle.whiteSpace10} />
          <ul className={Style.ulItem} >
            <li className={this.props.isEdit?EditStyle:Style.liItem} >
              <strong>Method:</strong>
              {this.props.isEdit?<span><Input defaultValue={recordDetail.method} key='Method' onChange={this.props.onChange}/></span>:<span>{recordDetail.method} </span>}
              {/* <span>{recordDetail.method} </span>
              <span><Input defaultValue={recordDetail.method} /></span> */}
            </li>
            <li className={this.props.isEdit?EditStyle:Style.liItem} >
              <strong>URL:</strong>
              {this.props.isEdit?<span><Input defaultValue={`${protocol}://${host}${path}`} key='url' onChange={this.props.onChange}/></span>:
                <span onClick={this.onSelectText} >{`${protocol}://${host}${path}`} </span>}
              {/* <span onClick={this.onSelectText} >{`${protocol}://${host}${path}`} </span>
              <span><Input defaultValue={`${protocol}://${host}${path}`} /></span> */}
            </li>
            <li className={this.props.isEdit?EditStyle:Style.liItem} >
              <strong>Protocol:</strong>
              <span >HTTP/1.1</span>
            </li>
          </ul>
          <div className={CommonStyle.whiteSpace10} />
          <ul className={Style.ulItem} >
            <li className={Style.liItem} >
              <strong>CURL:</strong>
              <span>
                <a href="javascript:void(0)" onClick={this.copyCurlCmd} >copy as CURL</a>
              </span>
            </li>
          </ul>
        </div>
        <div className={Style.section} >
          <div >
            <span className={CommonStyle.sectionTitle}>Header</span>
          </div>
          {this.props.recordDetail.isEdit&& <div>
            <Button className={Style.btn} style={{'position':'absolute','right':'0','zIndex':'9999','top':'171px'}} onClick={this.props.onAddHeader}>add</Button>
          </div>}
          <div className={CommonStyle.whiteSpace10} />
          <ul className={Style.ulItem} >
            {this.getLiDivs(reqHeader)}
          </ul>
        </div>

        <div className={Style.section + ' ' + Style.noBorder} >
          <div >
            <span className={CommonStyle.sectionTitle}>Cookies</span>
          </div>
          {this.getCookieDiv(cookieString)}
        </div>

        <div className={Style.section} >
          <div >
            <span className={CommonStyle.sectionTitle}>Body</span>
          </div>
          <div className={CommonStyle.whiteSpace10} />
          {this.getReqBodyDiv()}
        </div>
      </div>
    );
  }

  render() {
    return this.getRequestDiv();
  }
}

export default RecordRequestDetail;
