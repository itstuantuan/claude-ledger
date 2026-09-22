# 云记账账务规则（Phase 0 草案）

> 本文是 Order、Payment、Return、Prepaid、Ledger、FinancialTransaction 的最高优先级规则。修改这些模块前必须先阅读。  
> 状态：**待确认**；确认前不得进入正式业务编码。

## 1. 金额与数量

- API 金额单位：人民币“元”的十进制定点字符串，最多 2 位小数；响应统一两位，如 `"3140.00"`。
- 前端内部：整数分 `bigint`；Go：`shopspring/decimal`；PostgreSQL：`NUMERIC(20,2)`。
- 数量：最多 3 位小数；PostgreSQL `NUMERIC(20,3)`。
- 禁止使用 float32/float64 参与金额或数量金额乘法。
- 行折前金额：`unit_price × quantity` 精确计算后按“分”四舍五入（half up）。
- 行净额：`gross_amount - discount_amount`。
- 订单金额：`goods_amount = Σ gross`；`discount_amount = Σ line discount`；`final_amount = Σ line net`。
- 退料分摊：非最后一次按 `line_net × return_qty / purchased_qty` 四舍五入；最后一次可退量全部退完时，金额取 `line_net - 历史有效退料金额`，消除累计尾差。

## 2. 三套账严格分离

### 2.1 Customer Receivable（客户应收）

回答“客户现在欠门店多少钱”。最终真相是 `ledger_entries` 的有符号金额之和。正数增加应收，负数减少应收。

### 2.2 Prepaid Balance（客户预存）

回答“客户提前存在门店的钱还剩多少”。最终真相是 `prepaid_transactions` 的有符号金额之和。`prepaid_accounts.balance` 只是事务内维护的汇总。

### 2.3 Financial Cash Flow（真实资金）

回答“门店实际收/付了多少钱”。最终真相是 `financial_transactions`。预存充值产生资金收入；预存抵扣不再次产生收入。

三个不变量：

```text
worker.current_receivable = SUM(ledger_entries.signed_amount)
prepaid_account.balance   = SUM(prepaid_transactions.signed_amount)
inventory_balance.qty     = SUM(inventory_transactions.signed_quantity)
```

汇总值不一致时告警并阻断风险操作；IntegrityCheck 不得静默修改历史流水。

## 3. 订单记账模型

确认订单先记录商品总债权，再分别记录本次即时付款和预存抵扣：

```text
Ledger ORDER_CHARGE       +final_amount
Ledger ORDER_PAYMENT      -payment_amount        （有真实即时付款时）
Ledger PREPAID_DEDUCTION  -prepaid_deduction     （使用预存时）
```

所以新增应收：

```text
added_receivable = final_amount - payment_amount - prepaid_deduction
```

这种三条流水比只写 `+added_receivable` 更可追溯，也与前端对账单同一 ORDER 行展示 charge/payment/prepaid 四列兼容。API 可把同一订单来源的三条 Ledger 聚合成一行返回。

订单即时付款还产生：

```text
Payment                  amount = payment_amount
FinancialTransaction     INCOME +payment_amount
```

订单预存抵扣还产生：

```text
PrepaidTransaction       DEDUCTION -prepaid_deduction
FinancialTransaction     无
```

未付款挂账不产生 FinancialTransaction。

## 4. 指定示例：订单 3000 / 微信 1000 / 预存 500 / 挂账 1500

同一个数据库事务内：

| 记录 | 内容 | 应收影响 | 预存影响 | 真实资金影响 |
|---|---|---:|---:|---:|
| Order | final=3000, payment=1000, prepaid=500, addedReceivable=1500 | — | — | — |
| OrderItem(s) | 固化材料、规格、单位、成交价、数量、优惠、净额 | — | — | — |
| Ledger #1 | ORDER_CHARGE | +3000 | 0 | 0 |
| Payment | 微信 1000，source=Order | — | — | — |
| Ledger #2 | ORDER_PAYMENT | -1000 | 0 | 0 |
| FinancialTransaction | INCOME / WECHAT / 1000 | 0 | 0 | +1000 |
| PrepaidTransaction | DEDUCTION / 500 | 0 | -500 | 0 |
| Ledger #3 | PREPAID_DEDUCTION | -500 | 0 | 0 |
| AuditLog | 创建订单及完整结果摘要 | 0 | 0 | 0 |

净结果：应收 `+1500`；预存 `-500`；真实资金 `+1000`。**预存抵扣绝不再记现金收入。**

## 5. 独立收款

- 前端当前 PaymentInput 没有 orderId；V1 兼容行为：先减少客户总应收，再按订单业务时间/创建顺序 FIFO 生成 `payment_allocations`。
- 收款不得超过客户当前应收；否则返回 `PAYMENT_EXCEEDS_RECEIVABLE`，不能制造负应收，也不能擅自把超额转预存。
- 分录：Ledger `PAYMENT -amount`；FinancialTransaction `INCOME +amount`；不改预存。
- Payment、Ledger、FinancialTransaction、allocations、汇总余额、审计和幂等结果必须同一事务提交。

## 6. 预存

### 6.1 充值

```text
PrepaidTransaction DEPOSIT +amount
FinancialTransaction INCOME +amount
Ledger 无
```

### 6.2 抵扣

```text
PrepaidTransaction DEDUCTION -amount
Ledger PREPAID_DEDUCTION -amount
FinancialTransaction 无
```

抵扣事务必须 `SELECT prepaid_accounts ... FOR UPDATE`；余额不足返回 `INSUFFICIENT_PREPAID_BALANCE`。

### 6.3 退款

```text
PrepaidTransaction REFUND -amount
FinancialTransaction EXPENSE +amount
Ledger 无
```

当前前端没有此 API，确认新 Contract 前不开放。

## 7. 退料

当前前端 Contract 只有按原单退料，且响应包含 `receivableReduction`，无 settlementType。兼容阶段只支持 CREDIT_RECEIVABLE：

- 退料总额按原订单行净额比例计算，不读取当前材料价格。
- 可退数量 = 原购买数量 - 已 CONFIRMED 且未冲正的退料数量。
- 锁定相关原订单行/退料汇总，防止并发超退。
- 冲应收额度不得超过客户当前应收及原单 outstanding；若退料金额大于可冲额度，当前 Contract 无法表达剩余去向，应拒绝并返回明确错误，不可吞掉差额。
- 分录：Ledger `RETURN_CREDIT -amount`；Financial/Prepaid 无；Inventory（启用时）`RETURN_IN +qty`。

未来前端加入 settlementType 后：

| settlementType | Ledger | Prepaid | Financial |
|---|---:|---:|---:|
| CREDIT_RECEIVABLE | `-amount` | 0 | 0 |
| CASH_REFUND | 仅按已结算且可退款来源规则处理，不能盲目减应收 | 0 | EXPENSE `+amount` |
| PREPAID_REFUND | 仅按已结算且可转存来源规则处理，不能盲目减应收 | `+amount` | 0 |

CASH_REFUND/PREPAID_REFUND 的应收分录取决于原订单已结算构成。实现前必须先确认“退料优先冲未付应收还是原支付来源”的业务政策。

## 8. 状态与生效时间

- DRAFT Order 不产生任何账务流水。
- CONFIRMED/PARTIALLY_PAID/PAID 是确认后的展示状态，账务事实来自流水。
- PENDING Return 不产生 Ledger、Financial、Prepaid 或 Inventory 变化。
- Return 确认必须是独立原子事务；已有权限的人“创建即确认”是当前 Mock 行为，正式 API 建议拆分但需前端确认。
- 所有账务流水用 `occurred_at` 表示业务发生时刻，`created_at` 表示系统写入时刻；均为 TIMESTAMPTZ/UTC 存储。
- 日/月统计按 Store.timezone（当前 Asia/Shanghai）切分。

## 9. 冲正

- 财务记录禁止 UPDATE/DELETE；错误通过新建反向业务记录与反向流水纠正。
- 每条反向流水用 `reversal_of_id` 指向原流水；同一原流水只能有一个有效冲正。
- 冲正原子地反转该业务产生的所有 Ledger、Prepaid、Financial、Inventory 影响。
- 已有有效退料的订单不得直接整单冲正；需先冲正关联退料，或使用经确认的复合冲正流程。
- 冲正后原记录保留，状态标为 REVERSED；审计记录理由、操作者、请求 ID。

## 10. 调账与期初

- 期初欠款必须是 `OPENING_BALANCE` LedgerEntry，关联导入批次/Adjustment，不能只写 Worker 汇总。
- 人工调账必须创建 Adjustment 单与 `ADJUSTMENT` LedgerEntry，记录方向、金额、理由、操作人。
- 禁止直接 UPDATE `current_receivable`、`prepaid_accounts.balance` 或库存余额来修账。

## 11. 订单展示快照

前端 Order 字段属于可重建展示快照：

```text
returnedAmount    = 有效确认退料总额
settledAmount     = 即时付款 + 预存抵扣 + 后续分配到该订单的 Payment
outstandingAmount = max(0, finalAmount - returnedAmount - settledAmount)
```

需要明确：`settledAmount` 不是现金收入，因为包含预存抵扣。真实现金统计只查 FinancialTransaction。

## 12. 事务与锁顺序

所有重要操作顺序固定，降低死锁风险：

1. 锁/校验 IdempotencyRecord。
2. 锁 Worker 账户汇总行。
3. 按 ID 升序锁 PrepaidAccount、Order/OrderItem、InventoryBalance。
4. 校验权限、状态、余额、可退数量和金额。
5. 写业务单及不可变流水。
6. 更新汇总和订单展示快照。
7. 写 AuditLog 和幂等响应。
8. COMMIT。

相同 key + 相同 operation + 相同 canonical request hash 返回第一次响应；key 相同但请求不同返回 `IDEMPOTENCY_CONFLICT`。
