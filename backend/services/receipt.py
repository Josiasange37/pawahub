from fpdf import FPDF
from datetime import datetime
import os


class ReceiptPDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(160, 160, 160)
        self.cell(0, 10, f"Receipt #{self.receipt_no}  |  Powered by Fluxpay", align="C")


def generate_receipt_pdf(
    receipt_number: str,
    business_name: str,
    business_phone: str,
    customer_name: str,
    customer_phone: str,
    items: list[dict],
    total_amount: int,
    payment_method: str,
    payment_status: str,
    created_at: str,
) -> str:
    pdf = ReceiptPDF()
    pdf.receipt_no = receipt_number
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=25)

    navy = (25, 45, 85)
    accent = (45, 105, 185)
    dark = (35, 35, 35)
    gray = (130, 130, 130)
    light = (245, 247, 250)
    green = (25, 135, 85)
    white = (255, 255, 255)
    y = 0

    # ── Top bar ──
    pdf.set_fill_color(*navy)
    pdf.rect(0, 0, 210, 52, "F")

    # Small decorative accent line
    pdf.set_fill_color(*accent)
    pdf.rect(0, 52, 210, 2, "F")

    # Paid badge
    r = 6
    cx, cy = 25, 26
    pdf.set_fill_color(*green)
    pdf.circle(cx, cy, r)
    pdf.set_text_color(*white)
    pdf.set_font("Helvetica", "B", 5)
    pdf.set_xy(cx - 3, cy - 2.5)
    pdf.cell(6, 5, "PAID", align="C")

    # Business name
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*white)
    pdf.set_xy(40, 16)
    pdf.cell(0, 10, business_name.upper())

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(180, 195, 220)
    pdf.set_xy(40, 28)
    pdf.cell(0, 6, "PAYMENT RECEIPT")

    # Receipt metadata
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(160, 180, 210)
    pdf.set_xy(40, 36)
    pdf.cell(0, 5, f"#{receipt_number}")

    try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        date_str = dt.strftime("%d %b %Y  %H:%M")
    except Exception:
        date_str = created_at
    pdf.set_xy(130, 36)
    pdf.cell(65, 5, date_str, align="R")

    # ── From / To ──
    y = 68
    pdf.set_y(y)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(*gray)
    pdf.set_x(15)
    pdf.cell(90, 4, "MERCHANT")
    pdf.cell(90, 4, "CUSTOMER")

    y += 6
    pdf.set_y(y)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*dark)
    pdf.set_x(15)
    pdf.cell(90, 6, business_name)
    pdf.cell(90, 6, customer_name or "Customer")

    y += 7
    pdf.set_y(y)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*gray)
    pdf.set_x(15)
    pdf.cell(90, 5, business_phone)

    phone_display = customer_phone
    if phone_display.startswith("237"):
        phone_display = f"+{phone_display[:3]} {phone_display[3:6]} {phone_display[6:]}"
    pdf.cell(90, 5, phone_display)

    # ── Divider ──
    y = 92
    pdf.set_y(y)
    pdf.set_draw_color(*accent)
    pdf.set_line_width(0.3)
    pdf.line(15, y, 195, y)

    # ── Table header ──
    y = 98
    pdf.set_y(y)
    pdf.set_fill_color(*light)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*gray)
    pdf.set_x(15)
    pdf.cell(8, 7, "", fill=True)
    pdf.cell(72, 7, "ITEM", fill=True)
    pdf.cell(25, 7, "QTY", fill=True, align="C")
    pdf.cell(35, 7, "UNIT PRICE", fill=True, align="R")
    pdf.cell(35, 7, "SUBTOTAL", fill=True, align="R")

    # ── Items ──
    pdf.set_font("Helvetica", "", 9)
    y = 105
    for i, item in enumerate(items):
        if y > 245:
            pdf.add_page()
            y = 25

        bg = white if i % 2 == 0 else light
        pdf.set_fill_color(*bg)
        pdf.set_text_color(*dark)
        pdf.set_y(y)
        pdf.set_x(15)
        pdf.cell(8, 7, "", fill=True)
        pdf.cell(72, 7, f" {item['product_name']}", fill=True)
        pdf.cell(25, 7, str(item["quantity"]), fill=True, align="C")
        pdf.cell(35, 7, f"{item['unit_price']:,}", fill=True, align="R")
        pdf.cell(35, 7, f"{item['subtotal']:,}", fill=True, align="R")
        y += 7

    # ── Total ──
    y += 2
    pdf.set_draw_color(*accent)
    pdf.set_line_width(0.5)
    pdf.line(110, y, 195, y)

    y += 6
    pdf.set_y(y)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*navy)
    pdf.set_x(110)
    pdf.cell(40, 8, "TOTAL")
    pdf.set_x(148)
    pdf.cell(47, 8, f"{total_amount:,} XAF", align="R")

    # ── Payment info ──
    y += 16
    pdf.set_y(y)
    pdf.set_fill_color(*light)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*dark)
    pdf.set_x(15)
    pdf.set_fill_color(*light)
    pdf.cell(85, 9, "", fill=True)
    pdf.cell(85, 9, "", fill=True)

    pdf.set_text_color(*gray)
    pdf.set_xy(18, y + 1)
    pdf.set_font("Helvetica", "B", 7)
    pdf.cell(40, 3, "METHOD")

    method_label = "Mobile Money" if payment_method == "momo" else "Orange Money"
    pdf.set_text_color(*dark)
    pdf.set_xy(18, y + 5)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(40, 4, method_label)

    pdf.set_text_color(*gray)
    pdf.set_xy(98, y + 1)
    pdf.set_font("Helvetica", "B", 7)
    pdf.cell(40, 3, "STATUS")

    status_label = payment_status.upper()
    status_color = green if payment_status == "completed" else (200, 150, 0)
    pdf.set_text_color(*status_color)
    pdf.set_xy(98, y + 5)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(40, 4, status_label)

    # ── Thank you ──
    y += 22
    pdf.set_y(y)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*gray)
    pdf.cell(0, 6, "Thank you for your purchase", align="C")

    y += 7
    pdf.set_y(y)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*gray)
    pdf.cell(0, 4, f"{business_name}  |  {business_phone}", align="C")

    # ── Bottom accent ──
    pdf.set_fill_color(*accent)
    pdf.rect(70, 285, 70, 1.5, "F")

    os.makedirs("/tmp/receipts", exist_ok=True)
    file_path = f"/tmp/receipts/{receipt_number}.pdf"
    pdf.output(file_path)
    return file_path
