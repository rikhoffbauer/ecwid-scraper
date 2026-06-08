import type { AssistantWidget, WidgetProduct } from "../../server/assistant";
import { executeAction } from "../../server/assistant";

function money(value?: number): string {
  return typeof value === "number" ? new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value) : "—";
}

function ProductMini({ product, best }: { product: WidgetProduct; best?: boolean }) {
  return <article className={`widget-product ${best ? "best" : ""}`}>
    {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <div className="widget-image-placeholder" />}
    <div><strong>{product.name}</strong><span>{product.storeName ?? product.sourceId}</span></div>
    <b>{money(product.price)}</b>
  </article>;
}

export function AssistantWidgetView({ widget, apiUrl, onAction }: { widget: AssistantWidget; apiUrl: string; onAction: (widget: AssistantWidget) => void }) {
  if (widget.type === "product") return <div className="assistant-widget"><ProductMini product={widget.product} /></div>;
  if (widget.type === "product-list" || widget.type === "comparison") return <section className="assistant-widget">
    <header><strong>{widget.title}</strong><span>{widget.products.length}</span></header>
    <div className={widget.type === "comparison" ? "widget-comparison" : "widget-product-list"}>
      {widget.products.map((product) => <ProductMini key={`${product.sourceId}:${product.productId}`} product={product} best={widget.type === "comparison" && product.productId === widget.bestProductId} />)}
    </div>
  </section>;
  if (widget.type === "event-list") return <section className="assistant-widget"><header><strong>{widget.title}</strong></header><div className="widget-events">{widget.events.map((event, index) => <div key={`${event.productId}:${index}`}><span className="event-dot" /><strong>{event.eventType.replace("product.", "")}</strong><span>{event.productId}</span><time>{event.observedAt.slice(0, 10)}</time></div>)}</div></section>;
  if (widget.type === "analysis-summary") return <section className="assistant-widget"><header><strong>{widget.title}</strong></header><div className="widget-metrics">{widget.metrics.map((metric) => <div key={metric.label}><b>{metric.value}</b><span>{metric.label}</span></div>)}</div></section>;
  if (widget.type === "price-history") {
    const values = widget.points.map((point) => point.value);
    const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
    const points = widget.points.map((point, index) => `${(index / Math.max(1, widget.points.length - 1)) * 100},${44 - ((point.value - min) / range) * 38}`).join(" ");
    return <section className="assistant-widget"><header><strong>{widget.title}</strong><span>{money(values.at(-1))}</span></header><svg className="widget-chart" viewBox="0 0 100 48" preserveAspectRatio="none"><polyline points={points} /></svg></section>;
  }
  if (widget.type === "action-result") return <section className={`assistant-widget action-result ${widget.tone}`}><div><strong>{widget.title}</strong>{widget.detail ? <p>{widget.detail}</p> : null}</div>{widget.undo ? <button onClick={async () => { await executeAction(apiUrl, widget.undo!.action, widget.undo!.input); onAction({ type: "action-result", title: "Action undone", tone: "success" }); }}>Undo</button> : null}</section>;
  return <a className="assistant-widget artifact" href={widget.url} target="_blank" rel="noreferrer">{widget.title}</a>;
}
