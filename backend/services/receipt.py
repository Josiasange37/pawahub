from fpdf import FPDF
from datetime import datetime
import os


class ReceiptPDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Powered by PawaSub", align="C")


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
    """Generate a professional receipt PDF. Returns the file path."""

    pdf = ReceiptPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Colors
    primary = (45, 85, 145)
    dark = (30, 30, 30)
    gray = (120, 120, 120)
    light_bg = (245, 247, 250)
    green = (34, 139, 34)
    white = (255, 255, 255)

    # Background stripe
    pdf.set_fill_color(*primary)
    pdf.rect(0, 0, 210, 50, "F")

    # Business name
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*white)
    pdf.set_xy(15, 12)
    pdf.cell(0, 10, business_name.upper())

    # Subtitle
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(200, 215, 240)
    pdf.set_xy(15, 24)
    pdf.cell(0, 6, "Payment Receipt")

    # Receipt number and date
    pdf.set_font("Helvetica", "", 9)
    pdf.set_xy(15, 34)
    pdf.cell(0, 5, f"Receipt #: {receipt_number}")
    pdf.set_xy(120, 34)
    pdf.cell(0, 5, f"Date: {datetime.fromisoformat(created_at.replace('Z', '+00:00')).strftime('%d %b %Y %H:%M')}")

    # From / To section
    pdf.set_y(58)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*gray)
    pdf.set_x(15)
    pdf.cell(90, 5, "FROM")
    pdf.cell(90, 5, "TO")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*dark)
    pdf.set_x(15)
    pdf.cell(90, 5, business_name)
    pdf.cell(90, 5, customer_name or "Customer")

    pdf.set_x(15)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*gray)
    pdf.cell(90, 5, business_phone)

    phone_display = customer_phone
    if phone_display.startswith("237"):
        phone_display = f"+{phone_display[:3]} {phone_display[3:6]} {phone_display[6:]}"
    pdf.cell(90, 5, phone_display)

    # Divider
    pdf.set_y(76)
    pdf.set_draw_color(*primary)
    pdf.set_line_width(0.5)
    pdf.line(15, 76, 195, 76)

    # Table header
    pdf.set_y(82)
    pdf.set_fill_color(*light_bg)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*dark)
    pdf.set_x(15)
    pdf.cell(80, 8, "  Item", border=0, fill=True)
    pdf.cell(30, 8, "Qty", border=0, fill=True, align="C")
    pdf.cell(35, 8, "Unit Price", border=0, fill=True, align="R")
    pdf.cell(30, 8, "Subtotal", border=0, fill=True, align="R")

    # Items
    pdf.set_font("Helvetica", "", 10)
    y = 90
    for i, item in enumerate(items):
        if y > 250:
            pdf.add_page()
            y = 20

        bg = white if i % 2 == 0 else light_bg
        pdf.set_fill_color(*bg)
        pdf.set_text_color(*dark)
        pdf.set_y(y)
        pdf.set_x(15)
        pdf.cell(80, 7, f"  {item['product_name']}", border=0, fill=True)
        pdf.cell(30, 7, str(item["quantity"]), border=0, fill=True, align="C")
        pdf.cell(35, 7, f"{item['unit_price']:,}", border=0, fill=True, align="R")
        pdf.cell(30, 7, f"{item['subtotal']:,}", border=0, fill=True, align="R")
        y += 7

    # Total
    y += 4
    pdf.set_y(y)
    pdf.set_draw_color(*primary)
    pdf.set_line_width(0.3)
    pdf.line(15, y, 195, y)
    y += 4

    pdf.set_y(y)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*primary)
    pdf.set_x(100)
    pdf.cell(40, 8, "TOTAL:")
    pdf.set_x(140)
    pdf.cell(55, 8, f"{total_amount:,} XAF", align="R")

    # Payment info
    y += 16
    pdf.set_y(y)
    pdf.set_fill_color(*light_bg)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*dark)

    method_label = "MTN Mobile Money" if payment_method == "momo" else "Orange Money"
    status_label = payment_status.upper()
    status_color = green if payment_status == "completed" else (200, 150, 0)

    pdf.set_x(15)
    pdf.cell(60, 7, f"  Payment Method: {method_label}", border=0, fill=True)
    pdf.set_text_color(*status_color)
    pdf.cell(60, 7, f"  Status: {status_label}", border=0, fill=True)

    # Thank you message
    y += 20
    pdf.set_y(y)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*primary)
    pdf.cell(0, 8, "Thank you for your purchase!", align="C")

    y += 10
    pdf.set_y(y)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*gray)
    pdf.cell(0, 5, "For questions about this receipt, contact:", align="C")
    y += 5
    pdf.set_y(y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*dark)
    pdf.cell(0, 5, f"{business_name} | {business_phone}", align="C")

    # Save
    os.makedirs("/tmp/receipts", exist_ok=True)
    file_path = f"/tmp/receipts/{receipt_number}.pdf"
    pdf.output(file_path)
    return file_path
