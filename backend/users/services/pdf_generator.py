# users/services/pdf_generator.py
import os
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A6
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg
from django.conf import settings
from django.core.files.base import ContentFile

class PermitPDFGenerator:
    def __init__(self):
        self.width, self.height = landscape(A6)  # A6 горизонтально
        self._register_fonts()
        
    def _register_fonts(self):
        """Реєструємо шрифти з підтримкою кирилиці"""
        try:
            pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
            pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
            self.font_name = 'Arial'
            self.bold_font = 'Arial-Bold'
            self.regular_font = self.font_name
        except Exception as e:
            # print(f"⚠️ Неможливо завантажити Arial: {e}")
            self.font_name = 'Helvetica'
            self.bold_font = 'Helvetica-Bold'
            self.regular_font = self.font_name  # 👈 обов’язково

    
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
        """Генерує PDF перепустки в стилі HTML шаблону"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=landscape(A6))
        
        # Сторінка 1: Основна інформація
        self._draw_page1(p, permit)
        p.showPage()
        
        # Сторінка 2: Документи
        self._draw_page2(p, permit)
        p.save()
        
        pdf_content = buffer.getvalue()
        buffer.close()
        
        filename = f"permit_{permit.permit_number}.pdf"
        permit.pdf_file.save(filename, ContentFile(pdf_content), save=False)
        return permit
    
    def _draw_page1(self, canvas, permit):
        """Перша сторінка - основна інформація"""
        margin = 8 * mm
        
        # Header з логотипом та заголовком
        self._draw_header(canvas, permit.permit_number, margin)
        
        # Тип перепустки
        y_pos = self.height - 40 * mm
        if permit.permit_type == 'technic':
            self._draw_centered_text(canvas, y_pos, "на автомобіль", self.font_name, 11, colors.blue)
        elif permit.permit_type == 'employee':
            self._draw_centered_text(canvas, y_pos, "на працівника", self.font_name, 11, colors.blue)
        
        # Основний контент
        y_pos = self.height - 50 * mm
        
        # "Видано:" — звичайним
        canvas.setFont(self.regular_font, 10)
        canvas.setFillColor(colors.black)
        canvas.drawString(margin, y_pos, "Видано:")

        # Дані — жирним, але поруч
        text_width = canvas.stringWidth("Видано:", self.regular_font, 10)
        canvas.setFont(self.bold_font, 10)
        canvas.drawString(margin + text_width + 5, y_pos, permit.user.company_name)

        y_pos -= 12

        
        # Інформація про суб'єкт
        y_pos -= 6
        if permit.employee:
            # Лейбл звичайним
            canvas.setFont(self.regular_font, 10)
            canvas.setFillColor(colors.black)
            label = "ПІБ працівника підрядної організації:"
            canvas.drawString(margin, y_pos, label)

            # Дані жирним після лейбла
            text_width = canvas.stringWidth(label, self.regular_font, 10)
            canvas.setFont(self.bold_font, 10)
            canvas.drawString(margin + text_width + 5, y_pos, permit.employee.name)

            y_pos -= 18

            
            
                
        elif permit.technic:
           # Держ. номер авто
            label = "Державний реєстраційний номер автомобіля:"

            # Лейбл звичайним
            canvas.setFont(self.regular_font, 10)
            canvas.setFillColor(colors.black)
            canvas.drawString(margin, y_pos, label)\

            # Значення жирним після лейбла
            text_width = canvas.stringWidth(label, self.regular_font, 10)
            canvas.setFont(self.bold_font, 10)
            registration_number = permit.technic.registration_number or "______________"
            canvas.drawString(margin + text_width + 5, y_pos, registration_number)

            y_pos -= 18

        

        


        
        # Дійсна до
        label = "Дійсна до:"

        # Лейбл звичайним
        canvas.setFont(self.regular_font, 10)
        canvas.setFillColor(colors.black)
        canvas.drawString(margin, y_pos, label)

        # Значення жирним після лейбла
        text_width = canvas.stringWidth(label, self.regular_font, 10)
        canvas.setFont(self.bold_font, 10)
        canvas.drawString(margin + text_width + 5, y_pos, "_____________________ (м/д/р)")

        y_pos -= 18

        # Footer
        self._draw_footer(canvas, permit, margin)
    
    def _draw_page2(self, canvas, permit):
        """Друга сторінка - документи"""
        margin = 8 * mm
        
        # Header
        self._draw_header_page2(canvas, margin)
        
        # Заголовок документів
        y_pos = self.height - 35 * mm
        canvas.setFont(self.bold_font, 11)
        canvas.setFillColor(colors.Color(0.32, 0.77, 0.10))  # #52c41a
        text = "Перелік документації згідно завантаженого переліку"
        text_width = canvas.stringWidth(text, self.bold_font, 11)
        x_centered = (self.width - text_width) / 2
        canvas.drawString(x_centered, y_pos, text)
        
        # Таблиця документів
        documents = self._get_all_documents(permit)
        y_pos = self.height - 50 * mm
        
        if documents:
            self._draw_documents_table(canvas, documents, margin, y_pos)
        else:
            # Немає документів
            canvas.setFont(self.font_name, 10)
            canvas.setFillColor(colors.grey)
            text = "Документи відсутні"
            text_width = canvas.stringWidth(text, self.font_name, 10)
            x_centered = (self.width - text_width) / 2
            canvas.drawString(x_centered, y_pos, text)
            
            # Червоний текст
            y_pos -= 15
            canvas.setFont(self.bold_font, 9)
            canvas.setFillColor(colors.red)
            text = "Згідно переліку завантажених документів"
            text_width = canvas.stringWidth(text, self.bold_font, 9)
            x_centered = (self.width - text_width) / 2
            canvas.drawString(x_centered, y_pos, text)
    
    def _draw_header(self, canvas, permit_number, margin):
        """Малює header першої сторінки"""
        y_pos = self.height - 15 * mm
        
        # Лінія внизу header
        canvas.setStrokeColor(colors.Color(0.32, 0.77, 0.10))  # #52c41a
        canvas.setLineWidth(2)
        canvas.line(margin, y_pos - 8, self.width - margin, y_pos - 8)
        
        # Логотип (тепер замість емодзі)
        self._draw_logo(canvas, margin, y_pos + 10, width=75)
        
        # Заголовок ПЕРЕПУСТКА
        canvas.setFont(self.bold_font, 14)
        canvas.setFillColor(colors.black)
        text = "ПЕРЕПУСТКА"
        text_width = canvas.stringWidth(text, self.bold_font, 14)
        x_centered = (self.width - text_width) / 2
        canvas.drawString(x_centered, y_pos, text)
        
        # Номер перепустки
        canvas.setFont(self.bold_font, 10)
        canvas.setFillColor(colors.black)
        # Фон для номера
        text_width = canvas.stringWidth(permit_number, self.bold_font, 10)
        rect_x = self.width - margin - text_width - 6
        canvas.setFillColor(colors.Color(0.94, 0.94, 0.94))  # #f0f0f0
        canvas.rect(rect_x, y_pos - 2, text_width + 6, 12, fill=1, stroke=0)
        # Текст номера
        canvas.setFillColor(colors.black)
        canvas.drawString(rect_x + 3, y_pos, permit_number)
    
    def _draw_header_page2(self, canvas, margin):
        """Header другої сторінки"""
        y_pos = self.height - 15 * mm
        
        # Лінія
        canvas.setStrokeColor(colors.Color(0.32, 0.77, 0.10))
        canvas.setLineWidth(2)
        canvas.line(margin, y_pos - 8, self.width - margin, y_pos - 8)
        
        # Логотип
        self._draw_logo(canvas, margin, y_pos + 10, width=75)
        
        # ПЕРЕПУСТКА
        canvas.setFont(self.bold_font, 14)
        canvas.setFillColor(colors.black)
        text = "ПЕРЕПУСТКА"
        text_width = canvas.stringWidth(text, self.bold_font, 14)
        x_centered = (self.width - text_width) / 2
        canvas.drawString(x_centered, y_pos, text)

    
    def _draw_documents_table(self, canvas, documents, margin, start_y):
        """Малює таблицю документів"""
        row_height = 10
        col1_width = 90 * mm
        col2_width = 35 * mm
        
        y_pos = start_y
        
        # Заголовок таблиці
        canvas.setFillColor(colors.Color(0.96, 0.96, 0.96))  # #f5f5f5
        canvas.rect(margin, y_pos, col1_width, row_height, fill=1, stroke=1)
        canvas.rect(margin + col1_width, y_pos, col2_width, row_height, fill=1, stroke=1)
        
        canvas.setFont(self.bold_font, 8)
        canvas.setFillColor(colors.black)
        canvas.drawString(margin + 3, y_pos + 3, "Кваліфікаційне посвідчення")
        canvas.drawString(margin + col1_width + 3, y_pos + 3, "Дата закінчення дії")
        
        y_pos -= row_height
        
        # Рядки даних
        for i, doc in enumerate(documents[:12]):  # Максимум 12 рядків
            # Чергування кольорів
            if i % 2 == 0:
                canvas.setFillColor(colors.Color(0.98, 0.98, 0.98))  # #fafafa
                canvas.rect(margin, y_pos, col1_width + col2_width, row_height, fill=1, stroke=0)
            
            # Рамка
            canvas.setStrokeColor(colors.Color(0.87, 0.87, 0.87))  # #ddd
            canvas.rect(margin, y_pos, col1_width, row_height, fill=0, stroke=1)
            canvas.rect(margin + col1_width, y_pos, col2_width, row_height, fill=0, stroke=1)
            
            # Текст документу
            canvas.setFont(self.font_name, 8)
            canvas.setFillColor(colors.black)
            doc_name = doc['name'][:40] + '...' if len(doc['name']) > 40 else doc['name']
            canvas.drawString(margin + 3, y_pos + 3, doc_name)
            
            # Дата
            expiry = doc['expiry_date'] if doc['expiry_date'] else '-'
            canvas.setFont(self.bold_font, 8)
            text_width = canvas.stringWidth(expiry, self.bold_font, 8)
            canvas.drawString(margin + col1_width + (col2_width - text_width) / 2, y_pos + 3, expiry)
            
            y_pos -= row_height
        
        # Порожні рядки для заповнення
        empty_rows = 12 - len(documents) if len(documents) < 12 else 0
        for i in range(empty_rows):
            canvas.setStrokeColor(colors.Color(0.87, 0.87, 0.87))
            canvas.rect(margin, y_pos, col1_width, row_height, fill=0, stroke=1)
            canvas.rect(margin + col1_width, y_pos, col2_width, row_height, fill=0, stroke=1)
            y_pos -= row_height
    
    def _draw_footer(self, canvas, permit, margin):
        """Footer першої сторінки"""
        y_pos = 15 * mm
        
        # Лінія зверху
        canvas.setStrokeColor(colors.Color(0.87, 0.87, 0.87))
        canvas.setLineWidth(1)
        canvas.line(margin, y_pos + 10, self.width - margin, y_pos + 10)
        
        # Текст зліва
        canvas.setFont(self.font_name, 8)
        canvas.setFillColor(colors.grey)
        canvas.drawString(margin, y_pos, "Видав представник")
        canvas.drawString(margin, y_pos - 8, "ПП Західний Буг (ПІБ, Підпис, Печатка)")
        

    
    def _draw_centered_text(self, canvas, y_pos, text, font, size, color):
        """Малює центрований текст"""
        canvas.setFont(font, size)
        canvas.setFillColor(color)
        text_width = canvas.stringWidth(text, font, size)
        x_centered = (self.width - text_width) / 2
        canvas.drawString(x_centered, y_pos, text)
    
    def _get_all_documents(self, permit):
        """Отримує документи для перепустки"""
        documents = []
        
        if permit.employee:
            emp = permit.employee
            
            # Медогляд
            if emp.medical_exam_date:
                expiry = emp.medical_exam_date.strftime('%d.%m.%Y')
                org_name = f" ({emp.organization_name})" if emp.organization_name else ""
                documents.append({
                    'name': f'Медичний огляд{org_name}',
                    'expiry_date': expiry
                })
            
            # Кваліфікація
            if emp.qualification_certificate:
                expiry = emp.qualification_issue_date.strftime('%d.%m.%Y') if emp.qualification_issue_date else None
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
                
        elif permit.technic:
            tech = permit.technic
            if tech.documents:
                for doc_type, files_list in tech.documents.items():
                    if isinstance(files_list, list):
                        for file_info in files_list:
                            doc_name = doc_type
                            expiry = None
                            if file_info.get('expiry_date'):
                                try:
                                    expiry_raw = file_info['expiry_date']
                                    if isinstance(expiry_raw, str):
                                        expiry = expiry_raw
                                    else:
                                        expiry = expiry_raw.strftime('%d.%m.%Y') if hasattr(expiry_raw, 'strftime') else str(expiry_raw)
                                except:
                                    expiry = None
                            
                            documents.append({
                                'name': doc_name,
                                'expiry_date': expiry
                            })
        
        return documents