import qrcode

URL = "https://Mandy9011.github.io/GARDEN/"
OUT = "qr_app.png"

qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=10,
    border=4,
)
qr.add_data(URL)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save(OUT)
print("saved", OUT, "->", URL)
