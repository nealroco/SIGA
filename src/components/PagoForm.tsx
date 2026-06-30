"use client";

import { registrarPago } from "@/actions/financiera";

export default function PagoForm({ cuentaCobroId }: { cuentaCobroId: number }) {
  return (
    <form action={registrarPago} className="card" style={{ padding: 24, marginTop: 18, maxWidth: 760 }}>
      <p className="section-cap">Registrar pago</p>
      <input type="hidden" name="cuentaCobroId" value={cuentaCobroId} />

      <div className="form-grid">
        <div className="field">
          <label htmlFor="valorPagado">Valor pagado (COP) <span className="req">*</span></label>
          <input id="valorPagado" name="valorPagado" className="input" type="number" min={0} step="any" required />
        </div>
        <div className="field">
          <label htmlFor="medioPago">Medio de pago</label>
          <select id="medioPago" name="medioPago" className="select" defaultValue="Transferencia">
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
            <option value="PSE">PSE</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="comprobante">Comprobante</label>
        <input id="comprobante" name="comprobante" className="input" placeholder="N.º de comprobante / referencia" />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-primary" type="submit">Registrar pago</button>
      </div>
      <p className="page-sub" style={{ marginTop: 12 }}>
        RN-008: el pago no puede superar el valor aprobado de la cuenta. RN-009: el pago no puede superar el saldo
        disponible del rubro presupuestal.
      </p>
    </form>
  );
}
