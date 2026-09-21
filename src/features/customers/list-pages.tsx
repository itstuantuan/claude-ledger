"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Edit3, Eye, Plus, ReceiptText, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  Pagination,
  SearchBox,
  StatusBadge,
  formatDateTime,
} from "@/components/business/customer-ui";
import { ErrorState, LoadingState } from "@/components/common/error-state";
import { PermissionGate } from "@/components/common/permission-gate";
import { formatMoney } from "@/lib/utils/money";
import { projectsApi, teamsApi, workersApi } from "@/lib/api/customers";
import { ProjectForm, TeamForm, WorkerForm } from "./forms";
import type { Project, Team, Worker } from "./schema";

function useFilterUrl() {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const set = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in values)) next.set("page", "1");
    router.replace(`${pathname}?${next}`);
  };
  const href = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `${pathname}?${next}`;
  };
  return { params, set, href };
}
function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex items-end justify-between gap-5 max-[600px]:flex-col max-[600px]:items-start">
      <div>
        <p className="mb-2 text-xs text-[#92928d]">{eyebrow}</p>
        <h1 className="font-serif text-[28px] font-medium tracking-[-.5px]">{title}</h1>
        <p className="mt-2.5 text-[13px] text-[#868d80]">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function WorkersPage() {
  const { params, set, href } = useFilterUrl();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Worker>();
  const query = useQuery({
    queryKey: ["workers", params.toString()],
    queryFn: ({ signal }) =>
      workersApi.list(
        {
          search: params.get("search"),
          teamId: params.get("teamId"),
          debt: params.get("debt"),
          status: params.get("status"),
          sort: params.get("sort"),
          page: params.get("page") || 1,
          pageSize: 10,
        },
        signal,
      ),
  });
  const teams = useQuery({
    queryKey: ["teams", "options"],
    queryFn: ({ signal }) => teamsApi.list({ pageSize: 50 }, signal),
  });
  return (
    <>
      <PageHeader
        eyebrow="客户管理"
        title="油漆工"
        description="账务默认归属油漆工本人，施工队只做成员和统计汇总。"
        action={
          <PermissionGate permission="workers:write">
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus size={16} />
              新增油漆工
            </Button>
          </PermissionGate>
        }
      />
      <form
        className="mb-4 flex w-full flex-row items-center gap-2.5 max-[1200px]:flex-wrap [&>select]:h-10 [&>select]:shrink-0 [&>select]:rounded-lg [&>select]:border [&>select]:border-[#deded9] [&>select]:bg-white [&>select]:px-3 [&>select]:text-xs [&>select]:text-[#52584f] max-[600px]:[&>select]:min-w-[140px] max-[600px]:[&>select]:flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          set({ search: String(data.get("search") || "") });
        }}
      >
        <SearchBox
          defaultValue={params.get("search") || ""}
          placeholder="搜索姓名、手机号或微信号"
        />
        <select
          aria-label="施工队筛选"
          value={params.get("teamId") || ""}
          onChange={(e) => set({ teamId: e.target.value })}
        >
          <option value="">全部施工队</option>
          {teams.data?.items.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select
          aria-label="欠款状态"
          value={params.get("debt") || ""}
          onChange={(e) => set({ debt: e.target.value })}
        >
          <option value="">全部欠款状态</option>
          <option value="owing">有欠款</option>
          <option value="clear">已结清</option>
        </select>
        <select
          aria-label="客户状态"
          value={params.get("status") || ""}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">正常</option>
          <option value="DISABLED">已停用</option>
        </select>
        <select
          aria-label="排序"
          value={params.get("sort") || "lastTransactionAt_desc"}
          onChange={(e) => set({ sort: e.target.value })}
        >
          <option value="lastTransactionAt_desc">最近交易</option>
          <option value="receivable_desc">欠款从高到低</option>
          <option value="name_asc">姓名排序</option>
        </select>
        <Button variant="outline">搜索</Button>
      </form>
      {query.isPending ? (
        <LoadingState label="正在加载油漆工…" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <section className="overflow-hidden rounded-[14px] border border-[#e7e7e3] bg-white">
          {query.data.items.length ? (
            <div className="overflow-auto">
              <table className="w-full min-w-[1060px] border-collapse text-xs [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[#e7e7e3] [&_th]:bg-[#fafaf8] [&_th]:px-3.5 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#8d928a] [&_td]:whitespace-nowrap [&_td]:border-b [&_td]:border-[#efefeb] [&_td]:px-3.5 [&_td]:py-3.5 [&_td]:align-middle [&_td]:text-[#555a52] [&_tbody_tr:hover]:bg-[#fafbf8] [&_tbody_tr:last-child_td]:border-0">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>施工队</th>
                    <th>累计用料</th>
                    <th>累计退料</th>
                    <th>累计付款</th>
                    <th>预存余额</th>
                    <th>当前欠款</th>
                    <th>最后交易</th>
                    <th>状态</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          className="flex items-center gap-2.5 text-[#394c32] [&_small]:mt-1 [&_small]:block [&_small]:text-[10px] [&_small]:text-[#9a9e96] [&_strong]:block [&_strong]:font-semibold"
                          href={`/workers/${item.id}`}
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-[#e8eee4] text-[11px] text-[#617557]">{item.name[0]}</span>
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.phone}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{item.teamName || "独立油漆工"}</td>
                      <td>{formatMoney(item.materialTotal)}</td>
                      <td>{formatMoney(item.returnTotal)}</td>
                      <td>{formatMoney(item.paymentTotal)}</td>
                      <td className="!text-[#558063]">
                        {formatMoney(item.prepaidBalance)}
                      </td>
                      <td
                        className={Number(item.receivable) > 0 ? "!text-[#bc7467]" : ""}
                      >
                        {formatMoney(item.receivable)}
                      </td>
                      <td>{formatDateTime(item.lastTransactionAt)}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-0.5">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              aria-label={`查看 ${item.name}`}
                              href={`/workers/${item.id}`}
                            >
                              <Eye size={15} />
                            </Link>
                          </Button>
                          <PermissionGate permission="workers:write">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`编辑 ${item.name}`}
                              onClick={() => {
                                setEditing(item);
                                setFormOpen(true);
                              }}
                            >
                              <Edit3 size={15} />
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="没有找到油漆工" />
          )}
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            href={href}
          />
        </section>
      )}
      <WorkerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        value={editing}
        teams={teams.data?.items || []}
      />
    </>
  );
}

export function TeamsPage() {
  const { params, set, href } = useFilterUrl();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team>();
  const query = useQuery({
    queryKey: ["teams", params.toString()],
    queryFn: ({ signal }) =>
      teamsApi.list(
        {
          search: params.get("search"),
          page: params.get("page") || 1,
          pageSize: 10,
        },
        signal,
      ),
  });
  return (
    <>
      <PageHeader
        eyebrow="客户管理"
        title="施工队"
        description="施工队金额由成员汇总，不产生重复的队级欠款。"
        action={
          <PermissionGate permission="workers:write">
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} />
              新增施工队
            </Button>
          </PermissionGate>
        }
      />
      <form
        className="mb-4 flex w-full max-w-[670px] flex-row items-center gap-2.5 max-[1200px]:flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          set({
            search: String(new FormData(e.currentTarget).get("search") || ""),
          });
        }}
      >
        <SearchBox
          defaultValue={params.get("search") || ""}
          placeholder="搜索施工队、负责人或电话"
        />
        <Button variant="outline">搜索</Button>
      </form>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <section className="overflow-hidden rounded-[14px] border border-[#e7e7e3] bg-white">
          {query.data.items.length ? (
            <div className="overflow-auto">
              <table className="w-full min-w-[1060px] border-collapse text-xs [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[#e7e7e3] [&_th]:bg-[#fafaf8] [&_th]:px-3.5 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#8d928a] [&_td]:whitespace-nowrap [&_td]:border-b [&_td]:border-[#efefeb] [&_td]:px-3.5 [&_td]:py-3.5 [&_td]:align-middle [&_td]:text-[#555a52] [&_tbody_tr:hover]:bg-[#fafbf8] [&_tbody_tr:last-child_td]:border-0">
                <thead>
                  <tr>
                    <th>施工队</th>
                    <th>负责人</th>
                    <th>联系电话</th>
                    <th>成员</th>
                    <th>累计用料</th>
                    <th>累计付款</th>
                    <th>当前欠款</th>
                    <th>状态</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          className="flex items-center gap-2.5 text-[#394c32]"
                          href={`/teams/${item.id}`}
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-[#e8eee4] text-[11px] text-[#617557]">{item.name[0]}</span>
                          <strong>{item.name}</strong>
                        </Link>
                      </td>
                      <td>{item.leader}</td>
                      <td>{item.phone}</td>
                      <td>{item.memberCount} 人</td>
                      <td>{formatMoney(item.materialTotal)}</td>
                      <td>{formatMoney(item.paymentTotal)}</td>
                      <td
                        className={Number(item.receivable) > 0 ? "!text-[#bc7467]" : ""}
                      >
                        {formatMoney(item.receivable)}
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-0.5">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              aria-label={`查看 ${item.name}`}
                              href={`/teams/${item.id}`}
                            >
                              <Eye size={15} />
                            </Link>
                          </Button>
                          <PermissionGate permission="workers:write">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`编辑 ${item.name}`}
                              onClick={() => {
                                setEditing(item);
                                setOpen(true);
                              }}
                            >
                              <Edit3 size={15} />
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="没有找到施工队" />
          )}
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            href={href}
          />
        </section>
      )}
      <TeamForm open={open} onOpenChange={setOpen} value={editing} />
    </>
  );
}

export function ProjectsPage() {
  const { params, set, href } = useFilterUrl();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project>();
  const query = useQuery({
    queryKey: ["projects", params.toString()],
    queryFn: ({ signal }) =>
      projectsApi.list(
        {
          search: params.get("search"),
          status: params.get("status"),
          page: params.get("page") || 1,
          pageSize: 10,
        },
        signal,
      ),
  });
  const teams = useQuery({
    queryKey: ["teams", "options"],
    queryFn: ({ signal }) => teamsApi.list({ pageSize: 50 }, signal),
  });
  const workers = useQuery({
    queryKey: ["workers", "options"],
    queryFn: ({ signal }) => workersApi.list({ pageSize: 50 }, signal),
  });
  return (
    <>
      <PageHeader
        eyebrow="客户管理"
        title="工地 / 项目"
        description="明确每批材料使用在哪个工地，同时保留油漆工的账务归属。"
        action={
          <PermissionGate permission="workers:write">
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} />
              新增项目
            </Button>
          </PermissionGate>
        }
      />
      <form
        className="mb-4 flex w-full flex-row items-center gap-2.5 max-[1200px]:flex-wrap [&>select]:h-10 [&>select]:shrink-0 [&>select]:rounded-lg [&>select]:border [&>select]:border-[#deded9] [&>select]:bg-white [&>select]:px-3 [&>select]:text-xs [&>select]:text-[#52584f] max-[600px]:[&>select]:min-w-[140px] max-[600px]:[&>select]:flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          set({
            search: String(new FormData(e.currentTarget).get("search") || ""),
          });
        }}
      >
        <SearchBox
          defaultValue={params.get("search") || ""}
          placeholder="搜索项目、地址或负责人"
        />
        <select
          aria-label="项目状态"
          value={params.get("status") || ""}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">全部状态</option>
          <option value="PLANNING">筹备中</option>
          <option value="ACTIVE">进行中</option>
          <option value="COMPLETED">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
        <Button variant="outline">搜索</Button>
      </form>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <section className="overflow-hidden rounded-[14px] border border-[#e7e7e3] bg-white">
          {query.data.items.length ? (
            <div className="overflow-auto">
              <table className="w-full min-w-[1060px] border-collapse text-xs [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[#e7e7e3] [&_th]:bg-[#fafaf8] [&_th]:px-3.5 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#8d928a] [&_td]:whitespace-nowrap [&_td]:border-b [&_td]:border-[#efefeb] [&_td]:px-3.5 [&_td]:py-3.5 [&_td]:align-middle [&_td]:text-[#555a52] [&_tbody_tr:hover]:bg-[#fafbf8] [&_tbody_tr:last-child_td]:border-0">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>负责人</th>
                    <th>油漆工</th>
                    <th>施工队</th>
                    <th>开始时间</th>
                    <th>累计用料</th>
                    <th>状态</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          className="flex items-center gap-2.5 text-[#394c32] [&_small]:mt-1 [&_small]:block [&_small]:text-[10px] [&_small]:text-[#9a9e96] [&_strong]:block [&_strong]:font-semibold"
                          href={`/projects/${item.id}`}
                        >
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.address}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{item.manager}</td>
                      <td>{item.workerNames.join("、")}</td>
                      <td>{item.teamName || "—"}</td>
                      <td>{item.startDate || "未设置"}</td>
                      <td>{formatMoney(item.materialTotal)}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-0.5">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              aria-label={`查看 ${item.name}`}
                              href={`/projects/${item.id}`}
                            >
                              <Eye size={15} />
                            </Link>
                          </Button>
                          <PermissionGate permission="workers:write">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`编辑 ${item.name}`}
                              onClick={() => {
                                setEditing(item);
                                setOpen(true);
                              }}
                            >
                              <Edit3 size={15} />
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="没有找到项目" />
          )}
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            href={href}
          />
        </section>
      )}
      <ProjectForm
        open={open}
        onOpenChange={setOpen}
        value={editing}
        teams={teams.data?.items || []}
        workers={workers.data?.items || []}
      />
    </>
  );
}

export function DisabledBusinessAction({
  type,
}: {
  type: "order" | "payment";
}) {
  return (
    <Button variant="outline" disabled title="将在后续阶段开放">
      {type === "order" ? (
        <>
          <ReceiptText size={15} />
          开用料单
        </>
      ) : (
        <>
          <WalletCards size={15} />
          收款
        </>
      )}
    </Button>
  );
}
