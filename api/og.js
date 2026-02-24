import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

export default function handler() {
    return new ImageResponse(
        {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0a1f33 0%, #112a45 100%)',
                    padding: '60px 80px',
                    fontFamily: 'sans-serif',
                },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: 'rgba(19, 127, 236, 0.2)',
                                borderRadius: '20px',
                                padding: '8px 20px',
                                marginBottom: '30px',
                                alignSelf: 'flex-start',
                            },
                            children: {
                                type: 'span',
                                props: {
                                    style: { color: '#60a5fa', fontSize: '22px', fontWeight: 'bold' },
                                    children: '2026년 최신 생계비 기준 반영',
                                },
                            },
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: { color: '#ffffff', fontSize: '62px', fontWeight: 'bold', lineHeight: 1.3, marginBottom: '10px' },
                            children: '내 실제 변제금,',
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: { color: '#ffffff', fontSize: '62px', fontWeight: 'bold', lineHeight: 1.3, marginBottom: '20px' },
                            children: '1분이면 알 수 있습니다.',
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: { width: '300px', height: '5px', backgroundColor: '#137fec', marginBottom: '30px' },
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: { color: '#94a3b8', fontSize: '26px', marginBottom: '40px' },
                            children: '각 지역 회생법원 실무준칙 반영 · 정밀 시뮬레이션',
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', gap: '40px', marginBottom: '40px' },
                            children: [
                                {
                                    type: 'span',
                                    props: {
                                        style: { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' },
                                        children: '✓ 수임료 20만원 할인',
                                    },
                                },
                                {
                                    type: 'span',
                                    props: {
                                        style: { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' },
                                        children: '✓ 수임료 분할 납부',
                                    },
                                },
                            ],
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
                            children: [
                                {
                                    type: 'span',
                                    props: {
                                        style: { color: '#ffffff', fontSize: '28px', fontWeight: 'bold' },
                                        children: '⚖ 자가진단 | 개인회생 전문',
                                    },
                                },
                                {
                                    type: 'span',
                                    props: {
                                        style: { color: '#64748b', fontSize: '20px' },
                                        children: 'bankrupt-self.vercel.app',
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            width: 1200,
            height: 630,
        }
    );
}
