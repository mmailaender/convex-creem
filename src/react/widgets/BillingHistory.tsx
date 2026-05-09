import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvex } from "convex/react";
import {
  Pagination,
  type PaginationPageChangeDetails,
  type UsePaginationContext,
} from "@ark-ui/react/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  ConnectedBillingApi,
  ConnectedTransaction,
  ConnectedTransactionList,
} from "./types.js";
import { formatPrice } from "../shared.js";

const normalizeTimestamp = (timestamp: number | undefined): number | null => {
  if (!timestamp) return null;
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
};

const formatDate = (timestamp: number | undefined) => {
  const normalized = normalizeTimestamp(timestamp);
  if (!normalized) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(normalized));
};

const formatStatus = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getAmount = (transaction: ConnectedTransaction) =>
  transaction.amountPaid ?? transaction.amount;

const paginationItemClassName = (isCurrentPage: boolean) =>
  `${isCurrentPage ? "button-filled" : "button-faded"} h-8 min-w-8 px-2`;

export const BillingHistory = ({
  api,
  pageSize = 10,
  productId,
  orderId,
  className = "",
}: {
  api: ConnectedBillingApi;
  pageSize?: number;
  productId?: string;
  orderId?: string;
  class?: string;
  className?: string;
}) => {
  const client = useConvex();
  const searchRef = api.transactions?.search;
  const [pageNumber, setPageNumber] = useState(1);
  const [result, setResult] = useState<ConnectedTransactionList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchArgs = useMemo(
    () => ({
      pageNumber,
      pageSize,
      ...(productId ? { productId } : {}),
      ...(orderId ? { orderId } : {}),
    }),
    [orderId, pageNumber, pageSize, productId],
  );

  const loadTransactions = useCallback(async () => {
    if (!searchRef) return;
    setIsLoading(true);
    setError(null);
    try {
      const next = await client.action(searchRef, searchArgs);
      setResult(next as ConnectedTransactionList);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load billing history",
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, searchArgs, searchRef]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadTransactions();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadTransactions]);

  if (!searchRef) return null;

  const transactions = result?.items ?? [];
  const pagination = result?.pagination;

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="title-m text-foreground-default">Billing history</h2>
        {isLoading && (
          <span className="body-s text-foreground-placeholder">Loading...</span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-subtle">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead className="bg-surface-subtle">
              <tr className="label-s text-foreground-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface-base">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="body-s text-foreground-default"
                  >
                    <td className="px-4 py-3">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {transaction.description ?? transaction.id}
                    </td>
                    <td className="px-4 py-3">
                      {formatStatus(transaction.type)}
                    </td>
                    <td className="px-4 py-3">
                      {formatStatus(transaction.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPrice(
                        getAmount(transaction),
                        transaction.currency,
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center body-s text-foreground-muted"
                  >
                    {isLoading
                      ? "Loading billing history..."
                      : "No transactions yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination.Root
          count={pagination.totalRecords}
          page={pagination.currentPage}
          pageSize={pageSize}
          siblingCount={1}
          onPageChange={(details: PaginationPageChangeDetails) =>
            setPageNumber(details.page)
          }
          className={`flex items-center justify-end gap-2 ${isLoading ? "pointer-events-none opacity-60" : ""}`}
        >
          <Pagination.PrevTrigger
            className="icon-button-ghost-sm"
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Pagination.PrevTrigger>
          <Pagination.Context>
            {(api: UsePaginationContext) =>
              api.pages.map(
                (page: UsePaginationContext["pages"][number], index: number) =>
                  page.type === "page" ? (
                    <Pagination.Item
                      key={page.value}
                      type="page"
                      value={page.value}
                      className={paginationItemClassName(
                        page.value === api.page,
                      )}
                    >
                      {page.value}
                    </Pagination.Item>
                  ) : (
                    <Pagination.Ellipsis
                      key={`ellipsis-${index}`}
                      index={index}
                      className="body-s px-1 text-foreground-muted"
                    >
                      ...
                    </Pagination.Ellipsis>
                  ),
              )
            }
          </Pagination.Context>
          <Pagination.NextTrigger
            className="icon-button-ghost-sm"
            aria-label="Next page"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Pagination.NextTrigger>
        </Pagination.Root>
      )}
    </section>
  );
};
