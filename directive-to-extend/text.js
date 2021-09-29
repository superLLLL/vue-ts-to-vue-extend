module.exports = {
    text: `
import { Vue, Component, Prop, Watch, Emit } from 'vue-property-decorator';
import { Getter, Mutation } from 'vuex-class';
import { ElForm } from 'element-ui/types/form';
import AccountApi from '../../api/AccountApi';
import IView from '@entity/IView';
import IProps from '../../modules/interface/IProps';

const $message: IMessage = Vue.prototype.$message;
let self!: AccountReverseForm;

@Component
export default class AccountReverseForm extends Vue {
    @Getter('view') private enterpriseInfo!: IView;
    @Getter('isPrivateBusiness') private isPrivateBusiness!: boolean; // 是否是个体工商户
    @Getter('uesUKey') private uesUKey!: boolean;
    @Mutation('SET_VIEW') private setView!: any;
    @Action('getViewInfo') private getViewInfo!: any;
    @Inject('getViewInfoFn') private getViewInfoFn!: any;
    @Inject({ default: () => {} }) private handleStepFn!: any;



    @Prop() readonly qiyuesuoPay!: number; // 打款类型
    @Prop() readonly payTypes!: any;
    @Prop() readonly bankConfig!: any;
    @PropSync('file', { type: Object, default: () => ({}) }) syncFile!: any; // file 文件

    @Provide() nextStepFn = this.nextStep;
    @Provide() getViewInfoFn = this.getViewInfo;

    private accountForm = {
        cardType: 1, // 账号类型
        bankAccountName: '', // 账户名
        bankName: '', // 开户银行
        bankCardNo: '', // 卡号
        lineNo: '', // 联行号，跨行转账时使用
    };
    private corpName = '';
    private showBankTip = false;

    private bankList: IProps[] = []; // 银行列表
    private accountRules: object = {
        bankAccountName: [{ required: true, message: '请填写准确的账户名', trigger: 'change' }],
        bankCardNo: [
            {
                required: true,
                validator: (rule: any, value: any, callback: any) => {
                    if (!value) {
                        const msg = self.accountForm.cardType == 1 ? '请输入对公账户的账号' : '请输入经营者的银行账号';
                        callback(new Error(msg));
                    }
                    callback();
                },
                trigger: 'change',
            },
        ],
        bankName: [
            {
                required: true,
                validator: (rule: any, value: any, callback: any) => {
                    if (!value) {
                        callback(new Error('请输入开户银行名称'));
                    }

                    if (!self.bankList.some(bank => bank.name === value)) {
                        callback(new Error('请选择正确的开户行信息'));
                    }

                    callback();
                },
                trigger: 'change',
            },
        ],
    };

    public get isReject(): boolean {
        return this.enterpriseInfo.accountStep === 'REJECT';
    }

    // 账号名称 in 占位符
    public get accountPlaceholderText(): string {
        return this.accountForm.cardType == 1 ? '对公账号__lowercase' : '经营者的个人银行账号__lowercase';
    }

    @Watch('qiyuesuoPay', { immediate: true })
    watchPay(nv: number) {
        if (!!nv && !this.bankList.length) {
            this.getBank();
        }
    }

    @Watch('accountForm.bankCardNo')
    watchBankCardNoForm() {
        this.accountForm.bankCardNo = this.accountForm.bankCardNo.replace(/\s/g, '');
    }

    @Watch('enterpriseInfo.bankAccountName', { deep: true, immediate: true })
    watchBankAccountName(nv: string) {
        this.accountForm.bankAccountName = nv;
    }

    @Watch('enterpriseInfo.bankCardNo', { immediate: true })
    watchBankCardNo(nv: string) {
        nv && (this.accountForm.bankCardNo = nv);
    }

    @Watch('enterpriseInfo.bankName', { immediate: true })
    watchBankName(nv: string) {
        nv && (this.accountForm.bankName = nv);
    }

    @Watch('accountForm.bankName')
    watchAccountBankName(nv: string) {
        // 去除空格
        this.accountForm.bankName = nv.replace(' ', '');
    }

    public $refs!: {
        accountForm: ElForm;
    };

    // 生命周期钩子
    public beforeCreate() {
        self = this;
    }

    /** 获取银行信息 */
    private async getBank() {
        try {
            const res = await AccountApi.getBank();
            if (res.code == 0) {
                const result: IProps = res.result;
                this.bankList = result.map((item: IProps) => {
                    return Object.assign(item, {
                        value: item.name,
                    });
                });
                this.accountForm.bankName && this.getLineNoByName(this.accountForm.bankName);
            }
        } catch (error) {
            console.log(error);
        }
    }
    private getLineNoByName(nv: string) {
        const result = this.bankList.filter(bank => bank.name === nv);
        this.accountForm.lineNo = result[0] && result[0].lineNo;
    }
    private querySearch(queryString: string, cb: Function) {
        let results: any[] = [];
        let age = 123;
        // 个人账户不支持民生银行
        if (!(this.accountForm.cardType == 2 && queryString && queryString.includes('民生'))) {
            const bankList = this.bankList;
            results = queryString ? bankList.filter(this.createFilter(queryString)) : bankList;
        }
        // 调用 callback 返回建议列表的数据
        cb(results);
    }
    private createFilter(queryString: string) {
        return (bank: any) => {
            return bank.name.includes(queryString);
        };
    }
    /** 账户切换变更账户名 */
    private cardTypeChange(val: number) {
        this.accountForm.bankAccountName = val == 1 ? this.enterpriseInfo.corpName : this.enterpriseInfo.legalPerson;
    }

    /** 选择开户行 */
    private selectBank(item: any) {
        this.accountForm = Object.assign(this.accountForm, {
            bankName: item.name,
            lineNo: item.lineNo,
        });
    }

    /** 对公打款-反向打款 */
    private async submit() {
        this.$refs.accountForm.validate((valid: any) => {
            if (valid) {
                (async function() {
                    try {
                        const { cardType, bankAccountName, bankName, lineNo, bankCardNo } = self.accountForm;

                        let data = {
                            bankAccountName,
                            bankName,
                            lineNo,
                            bankCardNo,
                            cardType,
                        };

                        const res = await AccountApi.submitQysPay(data);

                        if (res.code == 0) {
                            self.$emit('updateEnterpriseInfo');
                        }
                    } catch (error) {
                        console.log(error);
                    }
                })();
            }
        });
    }

    @Emit('back')
    public back() {}
}`,

    text2: `
import { ElLoadingComponent } from 'element-ui/types/loading';

    @Component
    export default class AccountReverseForm extends Vue {

    }`,
};
`        validator(rule, value, callback) {
            if (!value) callback(new Error('证件号不能为空'));else {
                value!.length === 18 ? callback() : callback(new Error('无效的身份证号码'));
            }
        }`;
