<script lang="ts">
  import { useConvexClient } from "@mmailaender/convex-svelte";
  import { Pagination } from "@ark-ui/svelte/pagination";
  import type {
    PaginationPageChangeDetails,
    UsePaginationContext,
  } from "@ark-ui/svelte/pagination";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import type {
    ConnectedBillingApi,
    ConnectedTransaction,
    ConnectedTransactionList,
  } from "./types.js";
  import { formatPrice } from "../primitives/shared.js";

  interface Props {
    api: ConnectedBillingApi;
    pageSize?: number;
    productId?: string;
    orderId?: string;
    class?: string;
  }

  let {
    api,
    pageSize = 10,
    productId = undefined,
    orderId = undefined,
    class: className = "",
  }: Props = $props();

  const client = useConvexClient();
  // svelte-ignore state_referenced_locally
  const searchRef = api.transactions?.search;

  let pageNumber = $state(1);
  let result = $state<ConnectedTransactionList | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

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

  const loadTransactions = async (args: {
    pageNumber: number;
    pageSize: number;
    productId?: string;
    orderId?: string;
  }) => {
    if (!searchRef) return;
    isLoading = true;
    error = null;
    try {
      result = (await client.action(searchRef, args)) as ConnectedTransactionList;
    } catch (cause) {
      error = cause instanceof Error
        ? cause.message
        : "Could not load billing history";
    } finally {
      isLoading = false;
    }
  };

  $effect(() => {
    void loadTransactions({
      pageNumber,
      pageSize,
      ...(productId ? { productId } : {}),
      ...(orderId ? { orderId } : {}),
    });
  });

  const transactions = $derived(result?.items ?? []);
  const pagination = $derived(result?.pagination);
</script>

{#snippet paginationItems(api: UsePaginationContext)}
  {#each api().pages as page, index (`${page.type}-${page.type === "page" ? page.value : index}`)}
    {#if page.type === "page"}
      <Pagination.Item
        type="page"
        value={page.value}
        class={paginationItemClassName(page.value === api().page)}
      >
        {page.value}
      </Pagination.Item>
    {:else}
      <Pagination.Ellipsis
        index={index}
        class="body-s px-1 text-foreground-muted"
      >
        ...
      </Pagination.Ellipsis>
    {/if}
  {/each}
{/snippet}

{#if searchRef}
  <section class={`space-y-3 ${className}`}>
    <div class="flex items-center justify-between gap-3">
      <h2 class="title-m text-foreground-default">Billing history</h2>
      {#if isLoading}
        <span class="body-s text-foreground-placeholder">Loading...</span>
      {/if}
    </div>

    {#if error}
      <div class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    {/if}

    <div class="overflow-hidden rounded-xl border border-border-subtle">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[40rem] border-collapse text-left">
          <thead class="bg-surface-subtle">
            <tr class="label-s text-foreground-muted">
              <th class="px-4 py-3 font-medium">Date</th>
              <th class="px-4 py-3 font-medium">Description</th>
              <th class="px-4 py-3 font-medium">Type</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle bg-surface-base">
            {#if transactions.length > 0}
              {#each transactions as transaction (transaction.id)}
                <tr class="body-s text-foreground-default">
                  <td class="px-4 py-3">{formatDate(transaction.createdAt)}</td>
                  <td class="px-4 py-3">{transaction.description ?? transaction.id}</td>
                  <td class="px-4 py-3">{formatStatus(transaction.type)}</td>
                  <td class="px-4 py-3">{formatStatus(transaction.status)}</td>
                  <td class="px-4 py-3 text-right">
                    {formatPrice(getAmount(transaction), transaction.currency)}
                  </td>
                </tr>
              {/each}
            {:else}
              <tr>
                <td
                  colspan="5"
                  class="px-4 py-8 text-center body-s text-foreground-muted"
                >
                  {isLoading ? "Loading billing history..." : "No transactions yet"}
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    {#if pagination && pagination.totalPages > 1}
      <Pagination.Root
        count={pagination.totalRecords}
        page={pagination.currentPage}
        {pageSize}
        siblingCount={1}
        onPageChange={(details: PaginationPageChangeDetails) => {
          pageNumber = details.page;
        }}
        class={`flex items-center justify-end gap-2 ${isLoading ? "pointer-events-none opacity-60" : ""}`}
      >
        <Pagination.PrevTrigger
          class="icon-button-ghost-sm"
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" class="size-4" />
        </Pagination.PrevTrigger>
        <Pagination.Context render={paginationItems} />
        <Pagination.NextTrigger
          class="icon-button-ghost-sm"
          aria-label="Next page"
        >
          <ChevronRight aria-hidden="true" class="size-4" />
        </Pagination.NextTrigger>
      </Pagination.Root>
    {/if}
  </section>
{/if}
