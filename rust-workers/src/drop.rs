use image::{imageops, DynamicImage, GenericImage, ImageBuffer, ImageOutputFormat, Luma};
use leptess::{LepTess, Variable};
use node_bridge::NodeBridge;
use rayon::prelude::*;
use tokio::sync::mpsc;
use tokio::sync::oneshot;

use crate::card_handler::CardsHandleType;
use crate::card_handler::Character;

#[allow(unreachable_code)]
pub async fn drop_ocr_loop(
    mut drop_receiver: mpsc::Receiver<(DynamicImage, bool, oneshot::Sender<String>)>,
    bridge: NodeBridge,
    card_handler_sender: mpsc::Sender<CardsHandleType>,
) {
    let mut workers: [_; 9] = std::array::from_fn(|_| {
        let mut worker = LepTess::new(None, "eng").unwrap();
        worker
            .set_variable(Variable::TesseditPagesegMode, "7")
            .unwrap();
        worker
    });
    bridge.send("init", true).unwrap();
    loop {
        let (im, show_gen, return_sender) = drop_receiver.recv().await.unwrap();
        let output = ocr_drop(&show_gen, &mut workers, &im);
        let mut characters = vec![];
        for i in 0..3 {
            characters.push(Character {
                name: output.get(i * 2).unwrap().to_owned(),
                series: output.get(i * 2 + 1).unwrap().to_owned(),
                gen: Some(
                    output
                        .get(6 + i * 2 / 2)
                        .unwrap_or(&"null".to_string())
                        .to_string(),
                ),
                wl: None,
            });
        }
        let card_handler_sender_sub = card_handler_sender.clone();
        tokio::spawn(async move {
            card_handler_sender_sub
                .send(CardsHandleType::FindCard(characters, return_sender))
                .await
        });
    }
    bridge.close().await;
}

static CORDS: &[&[u32]] = &[
    &[12, 458, 290, 26],
    &[12, 487, 290, 26],
    &[361, 458, 290, 26],
    &[361, 487, 290, 26],
    &[704, 458, 290, 26],
    &[704, 487, 290, 26],
];

static CORDS_GEN: &[&[u32]] = &[
    &[12, 458, 290, 26],
    &[12, 487, 290, 26],
    &[361, 458, 290, 26],
    &[361, 487, 290, 26],
    &[704, 458, 290, 26],
    &[704, 487, 290, 26],
    &[36, 427, 108, 26],
    &[385, 427, 108, 26],
    &[728, 427, 108, 26],
];

fn ocr_drop(with_gen: &bool, workers: &mut [LepTess; 9], im: &DynamicImage) -> Vec<String> {
    let card_cordinates = if with_gen == &true {
        &CORDS_GEN
    } else {
        &CORDS
    };
    let arr = workers
        .par_iter_mut()
        .enumerate()
        .map(|(i, worker)| {
            if i >= card_cordinates.len() {
                return String::new();
            }
            if card_cordinates[i][2] == 108 {
                worker
                    .set_variable(Variable::TesseditCharWhitelist, "1234567890")
                    .unwrap();
            } else {
                worker
                    .set_variable(Variable::TesseditCharBlacklist, "|[]*ç€")
                    .unwrap();
                worker
                    .set_variable(Variable::TesseditCharWhitelist, "")
                    .unwrap();
            }
            sub_ocr(
                &mut im.clone(),
                worker,
                card_cordinates[i][0],
                card_cordinates[i][1],
                card_cordinates[i][2],
                card_cordinates[i][3],
            )
        })
        .collect();
    arr
}

pub fn sub_ocr(
    im: &mut DynamicImage,
    worker: &mut LepTess,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
) -> String {
    let baseim = im.sub_image(x, y, w, h);
    let mut subim = imageops::grayscale(&baseim.to_image());
    let mut linear = ImageBuffer::new(subim.width(), subim.height());
    for (x, y, pixel) in linear.enumerate_pixels_mut() {
        let p = subim.get_pixel(x, y);
        let new_p = (3.0 * p[0] as f32) as u8;
        subim.put_pixel(x, y, Luma([new_p]));
        *pixel = Luma([new_p]);
    }
    let mut extended = ImageBuffer::new(linear.width() + 14, linear.height() + 14);
    let white = Luma([255u8]);
    for y in 0..linear.height() {
        for x in 0..linear.width() {
            let p = subim.get_pixel(x, y);
            extended.put_pixel(x + 7, y + 7, p.to_owned());
        }
    }
    for y in 0..7 {
        for x in 0..linear.width() + 14 {
            extended.put_pixel(x, y, white);
            extended.put_pixel(x, y + linear.height() + 7, white);
        }
    }
    for x in 0..7 {
        for y in 7..linear.height() + 7 {
            extended.put_pixel(x, y, white);
            extended.put_pixel(x + linear.width() + 7, y, white);
        }
    }
    let mut writer = std::io::Cursor::new(vec![]);
    extended
        .write_to(&mut writer, ImageOutputFormat::Png)
        .unwrap();
    let arr = writer.into_inner();
    worker.set_image_from_mem(&arr).unwrap();
    worker.set_source_resolution(70);
    let output = worker
        .get_utf8_text()
        .unwrap()
        .to_ascii_lowercase()
        .trim()
        .to_string();
    output
}
