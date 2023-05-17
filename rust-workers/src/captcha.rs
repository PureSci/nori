use crate::card_handler::CardsHandleType;
use crate::card_handler::Character;
use crate::drop::sub_ocr;
use image::DynamicImage;
use leptess::LepTess;
use leptess::Variable;
use rayon::prelude::*;
use tokio::sync::mpsc;
use tokio::sync::mpsc::Sender;
use tokio::sync::oneshot;

pub async fn captcha_ocr_loop(
    mut captcha_receiver: mpsc::Receiver<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    init_sender: Sender<bool>,
    card_handler_sender: mpsc::Sender<CardsHandleType>,
) {
    let mut workers: [_; 3] = std::array::from_fn(|_| {
        let mut worker = LepTess::new(None, "eng").unwrap();
        worker
            .set_variable(Variable::TesseditPagesegMode, "7")
            .unwrap();
        worker
    });
    init_sender.send(true).await.unwrap();
    loop {
        let (im, return_sender) = captcha_receiver.recv().await.unwrap();
        let output = ocr_captcha(&mut workers, &im);
        let card = vec![Character {
            name: output[0].to_owned(),
            series: output[1].to_owned(),
            gen: Some(output[2].to_owned()),
            wl: None,
        }];
        let card_handler_sender_sub = card_handler_sender.clone();
        tokio::spawn(async move {
            card_handler_sender_sub
                .send(CardsHandleType::FindCard(card, return_sender))
                .await
        });
    }
}

static CORDS_GEN: &[&[u32]] = &[
    &[18, 460, 290, 27],
    &[18, 488, 290, 27],
    &[41, 430, 108, 27],
];

fn ocr_captcha(workers: &mut [LepTess; 3], im: &DynamicImage) -> Vec<String> {
    let arr = workers
        .par_iter_mut()
        .enumerate()
        .map(|(i, worker)| {
            if CORDS_GEN[i][2] == 108 {
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
                CORDS_GEN[i][0],
                CORDS_GEN[i][1],
                CORDS_GEN[i][2],
                CORDS_GEN[i][3],
            )
        })
        .collect();
    arr
}
