# users/services/pdf_generator.py
import os
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg
from reportlab.lib.utils import ImageReader
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image

class PermitPDFGenerator:
    def __init__(self):
        self.page_width, self.page_height = A4  # A4 вертикально
        self.card_width = self.page_width / 2  # Половина сторінки для кожної картки
        self.card_height = self.page_height
        self._register_fonts()
        
    def _register_fonts(self):
        font_dir = os.path.join(settings.BASE_DIR, "static", "fonts")

        try:
            pdfmetrics.registerFont(TTFont("Montserrat", os.path.join(font_dir, "Montserrat-Regular.ttf")))
            pdfmetrics.registerFont(TTFont("Montserrat-Bold", os.path.join(font_dir, "Montserrat-Bold.ttf")))
            self.font_name = "Montserrat"
            self.bold_font = "Montserrat-Bold"
            self.regular_font = self.font_name
        except Exception as e:
            self.font_name = "Roboto"
            self.bold_font = "Roboto-Bold"
            self.regular_font = self.font_name

    
    def _draw_logo(self, canvas, x, y, width=30):
        """Малює SVG логотип на вказаних координатах"""
        # Спробуємо кілька варіантів шляхів
        possible_paths = [
            os.path.join(settings.BASE_DIR, 'static', 'permits', 'logo-new.svg'),
            os.path.join(settings.STATICFILES_DIRS[0], 'permits', 'logo-new.svg') if hasattr(settings, 'STATICFILES_DIRS') and settings.STATICFILES_DIRS else None,
            os.path.join(settings.STATIC_ROOT, 'permits', 'logo-new.svg') if hasattr(settings, 'STATIC_ROOT') and settings.STATIC_ROOT else None,
        ]
        
        # Фільтруємо None значення
        possible_paths = [p for p in possible_paths if p is not None]
        
        for logo_path in possible_paths:
            try:
                if os.path.exists(logo_path):
                    
                    drawing = svg2rlg(logo_path)
                    if drawing:
                        
                        # Масштабуємо логотип
                        if drawing.width > 0 and drawing.height > 0:
                            scale_x = width / drawing.width
                            scale_y = width / drawing.height
                            scale = min(scale_x, scale_y)  # Зберігаємо пропорції
                            
                            drawing.width = drawing.width * scale
                            drawing.height = drawing.height * scale
                            drawing.scale(scale, scale)
                            
                            # Малюємо на canvas
                            renderPDF.draw(drawing, canvas, x, y - drawing.height)
                            return True
                        else:
                            print("❌ Некоректні розміри логотипу")
                    else:
                        print("❌ Не вдалося перетворити SVG в drawing")
                else:
                    print(f"❌ Файл не знайдено: {logo_path}")
                    
            except Exception as e:
                print(f"❌ Помилка з файлом {logo_path}: {e}")
                continue
        
        # Fallback - малюємо текст замість логотипу
        canvas.setFont(self.bold_font, 12)
        canvas.setFillColor(colors.Color(0.32, 0.77, 0.10))
        canvas.drawString(x, y - 10, "ЗАХІДНИЙ БУГ")
        print("⚠️ Використано текстовий fallback")
        return False
        
    def generate_permit(self, permit):
        """Генерує PDF перепустки на одній A4 сторінці (дві картки поруч)"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)

        # Ліва картка: Основна інформація
        self._draw_page1(p, permit, x_offset=0)

        # Вертикальна розділювальна лінія посередині
        p.setStrokeColor(colors.grey)
        p.setLineWidth(1)
        p.setDash(3, 3)  # Пунктирна лінія
        p.line(self.card_width, 0, self.card_width, self.page_height)

        # Права картка: Документи
        self._draw_page2(p, permit, x_offset=self.card_width)

        p.save()

        pdf_content = buffer.getvalue()
        buffer.close()

        filename = f"permit_{permit.permit_number}.pdf"
        permit.pdf_file.save(filename, ContentFile(pdf_content), save=False)
        return permit
    
    def _draw_page1(self, canvas, permit, x_offset=0):
        """Перша сторінка - основна інформація"""
        margin = 8 * mm

        # Header з логотипом та заголовком
        self._draw_header(canvas, permit.permit_number, margin, x_offset)

        # Фото працівника (якщо є) - справа зверху 30x40 мм
        if permit.employee and permit.employee.photo:
            self._draw_employee_photo(canvas, permit.employee, margin, x_offset)

        # Тип перепустки (тільки для техніки)
        if permit.permit_type == 'technic':
            y_pos = self.card_height - 40 * mm
            self._draw_centered_text(canvas, y_pos, "на автомобіль (техніку)", self.font_name, 11, colors.blue, x_offset)
            # Назва техніки під заголовком
            if permit.technic:
                technic_name = permit.technic.technic_type.name if permit.technic.technic_type else permit.technic.custom_type
                if technic_name:
                    y_pos -= 18
                    canvas.setFont(self.bold_font, 10)
                    canvas.setFillColor(colors.black)
                    text_width = canvas.stringWidth(technic_name, self.bold_font, 10)
                    x_centered = x_offset + (self.card_width - text_width) / 2
                    canvas.drawString(x_centered, y_pos, technic_name)
            # Основний контент для техніки
            y_pos = self.card_height - 55 * mm
        else:
            # Для працівника - контент починається під фото (65мм від верху: 20мм до фото + 40мм фото + 5мм відступ)
            y_pos = self.card_height - 75 * mm
        
        # "Видано:" — звичайним
        canvas.setFont(self.regular_font, 10)
        canvas.setFillColor(colors.black)
        canvas.drawString(x_offset + margin, y_pos, "Видано:")

        # Дані — жирним, але поруч
        text_width = canvas.stringWidth("Видано:", self.regular_font, 10)
        canvas.setFont(self.bold_font, 10)
        canvas.drawString(x_offset + margin + text_width + 5, y_pos, permit.user.company_name)

        y_pos -= 12


        # Інформація про суб'єкт
        y_pos -= 6
        if permit.employee:
            # Лейбл звичайним
            canvas.setFont(self.regular_font, 10)
            canvas.setFillColor(colors.black)
            label = "ПІБ працівника підрядної організації:"
            canvas.drawString(x_offset + margin, y_pos, label)

            # Дані жирним після лейбла
            text_width = canvas.stringWidth(label, self.regular_font, 10)
            canvas.setFont(self.bold_font, 10)
            canvas.drawString(x_offset + margin + text_width + 5, y_pos, permit.employee.name)

            y_pos -= 18



        elif permit.technic:
            if permit.technic.registration_number:
                # Держ. номер авто
                label = "Державний реєстраційний номер:"

                # Лейбл звичайним
                canvas.setFont(self.regular_font, 10)
                canvas.setFillColor(colors.black)
                canvas.drawString(x_offset + margin, y_pos, label)

                # Значення жирним після лейбла
                text_width = canvas.stringWidth(label, self.regular_font, 10)
                canvas.setFont(self.bold_font, 10)
                registration_number = permit.technic.registration_number or "______________"
                canvas.drawString(x_offset + margin + text_width + 5, y_pos, registration_number)

                y_pos -= 18




        # Дійсна до
        label = "Дійсна до:"

        # Лейбл звичайним
        canvas.setFont(self.regular_font, 10)
        canvas.setFillColor(colors.black)
        canvas.drawString(x_offset + margin, y_pos, label)

        # Значення жирним після лейбла
        text_width = canvas.stringWidth(label, self.regular_font, 10)
        canvas.setFont(self.bold_font, 10)
        canvas.drawString(x_offset + margin + text_width + 5, y_pos, "_____________________ (м/д/р)")

        y_pos -= 18

        # Footer
        self._draw_footer(canvas, permit, margin, x_offset)
    
    def _draw_page2(self, canvas, permit, x_offset=0):
        """Друга сторінка - документи"""
        margin = 8 * mm

        # Header з номером перепустки
        self._draw_header_page2(canvas, margin, permit.permit_number, x_offset)

        # Заголовок документів
        y_pos = self.card_height - 35 * mm
        canvas.setFont(self.bold_font, 11)
        canvas.setFillColor(colors.Color(0.32, 0.77, 0.10))  # #52c41a
        text = "Перелік документації"
        text_width = canvas.stringWidth(text, self.bold_font, 11)
        x_centered = x_offset + (self.card_width - text_width) / 2
        canvas.drawString(x_centered, y_pos, text)

        # Таблиця документів
        documents = self._get_all_documents(permit)
        y_pos = self.card_height - 50 * mm

        if documents:
            self._draw_documents_table(canvas, documents, margin, y_pos, x_offset)
        else:
            # Немає документів
            canvas.setFont(self.font_name, 10)
            canvas.setFillColor(colors.red)
            text = "Документи відсутні"
            text_width = canvas.stringWidth(text, self.font_name, 10)
            x_centered = x_offset + (self.card_width - text_width) / 2
            canvas.drawString(x_centered, y_pos, text)
            
            
    
    def _draw_header(self, canvas, permit_number, margin, x_offset=0):
        """Малює header першої сторінки"""
        y_pos = self.card_height - 5 * mm

        # Логотип по центру зверху - ширше в 1.5 рази
        logo_width = 75  # було 50
        logo_x = x_offset + (self.card_width - logo_width) / 2
        self._draw_logo(canvas, logo_x, y_pos, width=logo_width)

        # ПЕРЕПУСТКА зліва під логотипом - більший відступ
        y_pos -= 45  # було 15
        canvas.setFont(self.bold_font, 14)
        canvas.setFillColor(colors.black)
        canvas.drawString(x_offset + margin, y_pos, "ПЕРЕПУСТКА")

        # Номер перепустки справа на тому ж рівні
        canvas.setFont(self.bold_font, 10)
        text_width = canvas.stringWidth(permit_number, self.bold_font, 10)
        rect_x = x_offset + self.card_width - margin - text_width - 6
        # Фон для номера
        canvas.setFillColor(colors.Color(0.94, 0.94, 0.94))  # #f0f0f0
        canvas.rect(rect_x, y_pos - 2, text_width + 6, 12, fill=1, stroke=0)
        # Текст номера
        canvas.setFillColor(colors.black)
        canvas.drawString(rect_x + 3, y_pos, permit_number)

        # Лінія під хедером
        y_pos -= 5
        canvas.setStrokeColor(colors.Color(0.32, 0.77, 0.10))  # #52c41a
        canvas.setLineWidth(2)
        canvas.line(x_offset + margin, y_pos, x_offset + self.card_width - margin, y_pos)
    
    def _draw_header_page2(self, canvas, margin, permit_number, x_offset=0):
        """Header другої сторінки"""
        y_pos = self.card_height - 5 * mm

        # Логотип по центру зверху - ширше в 1.5 рази
        logo_width = 75  # було 50
        logo_x = x_offset + (self.card_width - logo_width) / 2
        self._draw_logo(canvas, logo_x, y_pos, width=logo_width)

        # ПЕРЕПУСТКА зліва під логотипом - більший відступ
        y_pos -= 45  # було 15
        canvas.setFont(self.bold_font, 14)
        canvas.setFillColor(colors.black)
        canvas.drawString(x_offset + margin, y_pos, "ПЕРЕПУСТКА")

        # Номер перепустки справа на тому ж рівні
        canvas.setFont(self.bold_font, 10)
        text_width = canvas.stringWidth(permit_number, self.bold_font, 10)
        rect_x = x_offset + self.card_width - margin - text_width - 6
        # Фон для номера
        canvas.setFillColor(colors.Color(0.94, 0.94, 0.94))  # #f0f0f0
        canvas.rect(rect_x, y_pos - 2, text_width + 6, 12, fill=1, stroke=0)
        # Текст номера
        canvas.setFillColor(colors.black)
        canvas.drawString(rect_x + 3, y_pos, permit_number)

        # Лінія під хедером
        y_pos -= 5
        canvas.setStrokeColor(colors.Color(0.32, 0.77, 0.10))  # #52c41a
        canvas.setLineWidth(2)
        canvas.line(x_offset + margin, y_pos, x_offset + self.card_width - margin, y_pos)

    
    def _draw_documents_table(self, canvas, documents, margin, start_y, x_offset=0):
        """Малює таблицю документів"""
        row_height = 10
        # Зменшуємо ширину колонок для половинки A4
        col1_width = 60 * mm
        col2_width = 30 * mm

        y_pos = start_y

        # Заголовок таблиці
        canvas.setFillColor(colors.Color(0.96, 0.96, 0.96))  # #f5f5f5
        canvas.rect(x_offset + margin, y_pos, col1_width, row_height, fill=1, stroke=1)
        canvas.rect(x_offset + margin + col1_width, y_pos, col2_width, row_height, fill=1, stroke=1)

        canvas.setFont(self.bold_font, 8)
        canvas.setFillColor(colors.black)
        canvas.drawString(x_offset + margin + 3, y_pos + 3, "Назва документу")
        canvas.drawString(x_offset + margin + col1_width + 3, y_pos + 3, "Дата закінчення дії")
        
        y_pos -= row_height

        # Рядки даних
        for i, doc in enumerate(documents[:12]):  # Максимум 12 рядків
            # Чергування кольорів
            if i % 2 == 0:
                canvas.setFillColor(colors.Color(0.98, 0.98, 0.98))  # #fafafa
                canvas.rect(x_offset + margin, y_pos, col1_width + col2_width, row_height, fill=1, stroke=0)

            # Рамка
            canvas.setStrokeColor(colors.Color(0.87, 0.87, 0.87))  # #ddd
            canvas.rect(x_offset + margin, y_pos, col1_width, row_height, fill=0, stroke=1)
            canvas.rect(x_offset + margin + col1_width, y_pos, col2_width, row_height, fill=0, stroke=1)

            # Текст документу
            canvas.setFont(self.font_name, 8)
            canvas.setFillColor(colors.black)
            doc_name = doc['name'][:30] + '...' if len(doc['name']) > 30 else doc['name']
            canvas.drawString(x_offset + margin + 3, y_pos + 3, doc_name)

            # Дата
            expiry = doc['expiry_date'] if doc['expiry_date'] else '-'
            canvas.setFont(self.bold_font, 8)
            text_width = canvas.stringWidth(expiry, self.bold_font, 8)
            canvas.drawString(x_offset + margin + col1_width + (col2_width - text_width) / 2, y_pos + 3, expiry)

            y_pos -= row_height

        # Порожні рядки для заповнення
        empty_rows = 12 - len(documents) if len(documents) < 12 else 0
        for i in range(empty_rows):
            canvas.setStrokeColor(colors.Color(0.87, 0.87, 0.87))
            canvas.rect(x_offset + margin, y_pos, col1_width, row_height, fill=0, stroke=1)
            canvas.rect(x_offset + margin + col1_width, y_pos, col2_width, row_height, fill=0, stroke=1)
            y_pos -= row_height
    
    def _draw_footer(self, canvas, permit, margin, x_offset=0):
        """Footer першої сторінки"""
        y_pos = 15 * mm

        # Лінія зверху
        canvas.setStrokeColor(colors.Color(0.87, 0.87, 0.87))
        canvas.setLineWidth(1)
        canvas.line(x_offset + margin, y_pos + 10, x_offset + self.card_width - margin, y_pos + 10)

        # Текст зліва
        canvas.setFont(self.font_name, 8)
        canvas.setFillColor(colors.grey)
        canvas.drawString(x_offset + margin, y_pos, "Видав представник")
        canvas.drawString(x_offset + margin, y_pos - 8, "ПП Західний Буг (ПІБ, Підпис, Печатка)")
        

    
    def _draw_centered_text(self, canvas, y_pos, text, font, size, color, x_offset=0):
        """Малює центрований текст"""
        canvas.setFont(font, size)
        canvas.setFillColor(color)
        text_width = canvas.stringWidth(text, font, size)
        x_centered = x_offset + (self.card_width - text_width) / 2
        canvas.drawString(x_centered, y_pos, text)

    def _draw_employee_photo(self, canvas, employee, margin, x_offset=0):
        """Малює фото працівника 30x40 мм справа зверху під хедером з cover fit"""
        try:
            # Отримуємо шлях до фото
            photo_path = employee.photo.path if hasattr(employee.photo, 'path') else None

            if not photo_path or not os.path.exists(photo_path):
                return

            # Розміри фото 30x40 мм
            photo_width = 30 * mm
            photo_height = 40 * mm

            # Позиція: справа зверху під хедером - вище в 2 рази (було 40мм, стало 20мм від верху)
            x_pos = x_offset + self.card_width - margin - photo_width
            y_pos = self.card_height - 25 * mm - photo_height

            # Завантажуємо фото
            img = Image.open(photo_path)
            img_reader = ImageReader(img)

            # object-fit: cover - розтягуємо по всій площі, обрізаючи зайве
            img_width, img_height = img.size
            aspect_ratio = img_width / img_height
            target_ratio = photo_width / photo_height

            if aspect_ratio > target_ratio:
                # Фото ширше - розтягуємо по висоті, обрізаємо ширину
                scale = photo_height / img_height
                scaled_width = img_width * scale
                scaled_height = photo_height
                x_crop = (scaled_width - photo_width) / 2
                # Малюємо з обрізкою
                canvas.saveState()
                canvas.rect(x_pos, y_pos, photo_width, photo_height, fill=0, stroke=0)
                p = canvas.beginPath()
                p.rect(x_pos, y_pos, photo_width, photo_height)
                canvas.clipPath(p, stroke=0)
                canvas.drawImage(img_reader, x_pos - x_crop, y_pos,
                               width=scaled_width, height=scaled_height, mask='auto')
                canvas.restoreState()
            else:
                # Фото вище - розтягуємо по ширині, обрізаємо висоту
                scale = photo_width / img_width
                scaled_width = photo_width
                scaled_height = img_height * scale
                y_crop = (scaled_height - photo_height) / 2
                # Малюємо з обрізкою
                canvas.saveState()
                canvas.rect(x_pos, y_pos, photo_width, photo_height, fill=0, stroke=0)
                p = canvas.beginPath()
                p.rect(x_pos, y_pos, photo_width, photo_height)
                canvas.clipPath(p, stroke=0)
                canvas.drawImage(img_reader, x_pos, y_pos - y_crop,
                               width=scaled_width, height=scaled_height, mask='auto')
                canvas.restoreState()

            # Малюємо рамку навколо фото
            canvas.setStrokeColor(colors.Color(0.87, 0.87, 0.87))
            canvas.setLineWidth(1)
            canvas.rect(x_pos, y_pos, photo_width, photo_height, fill=0, stroke=1)

        except Exception as e:
            print(f"❌ Помилка завантаження фото: {e}")
            # Placeholder
            x_pos = x_offset + self.card_width - margin - (30 * mm)
            y_pos = self.card_height - 20 * mm - (40 * mm)
            canvas.setFont(self.font_name, 8)
            canvas.setFillColor(colors.grey)
            canvas.rect(x_pos, y_pos, 30 * mm, 40 * mm, fill=0, stroke=1)
            canvas.drawString(x_pos + 5, y_pos + 20 * mm, "Фото")
    
    def _get_all_documents(self, permit):
        """Отримує документи для перепустки"""
        documents = []

        if permit.employee:
            emp = permit.employee

            # Кваліфікація
            if emp.qualification_certificate:
                expiry = emp.qualification_expiry_date.strftime('%d.%m.%Y') if emp.qualification_expiry_date else None
                documents.append({
                    'name': 'Кваліфікаційне посвідчення',
                    'expiry_date': expiry
                })

            # Охорона праці
            if emp.safety_training_certificate:
                expiry = emp.safety_training_date.strftime('%d.%m.%Y') if emp.safety_training_date else None
                documents.append({
                    'name': 'Посвідчення з охорони праці',
                    'expiry_date': expiry
                })

            # Спеціальне навчання
            if emp.special_training_certificate:
                expiry = emp.special_training_date.strftime('%d.%m.%Y') if emp.special_training_date else None
                documents.append({
                    'name': 'Посвідчення спеціального навчання',
                    'expiry_date': expiry
                })

            # Медогляд (тільки якщо є фото)
            if emp.medical_exam_photo:
                documents.append({
                    'name': 'Медичний огляд',
                    'expiry_date': None
                })
                
        elif permit.technic:
            tech = permit.technic
            if tech.documents:
                for doc_type, files_list in tech.documents.items():
                    if isinstance(files_list, list):
                        for file_info in files_list:
                            # ✅ якщо техніка кастомна — показуємо ім'я файлу
                            if doc_type == "general":
                                doc_name = (
                                    file_info.get("name")
                                    or file_info.get("filename")
                                    or doc_type
                                )
                            else:
                                doc_name = doc_type

                            expiry = None
                            if file_info.get("expiry_date"):
                                try:
                                    expiry_raw = file_info["expiry_date"]
                                    if isinstance(expiry_raw, str):
                                        expiry = expiry_raw
                                    else:
                                        expiry = (
                                            expiry_raw.strftime("%d.%m.%Y")
                                            if hasattr(expiry_raw, "strftime")
                                            else str(expiry_raw)
                                        )
                                except Exception:
                                    expiry = None

                            documents.append({
                                "name": doc_name,
                                "expiry_date": expiry,
                            })

        
        return documents