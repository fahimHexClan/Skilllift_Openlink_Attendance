import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const TYPE_MAP: Record<string, string> = {
  srNumber:  'user_id',
  sr_number: 'user_id',
  payId:     'payid',
  pay_id:    'payid',
  mobile:    'mobile',
  email:     'email',
  nic:       'nic',
};

// Token hardcoded — avoids Windows $-variable expansion issues in .env
const ACCESS_TOKEN = '$2y$10$S3W2WSR9sk5cf0yEqR1Rf.oZGkvhUu46idzux2QLMTTzt3m2IHIWS';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const searchType  = (body.searchType  ?? 'srNumber') as string;
    const searchValue = (body.searchValue ?? body.srNumber ?? '') as string;

    if (!searchValue.trim()) {
      return NextResponse.json({ error: 'SR number required' }, { status: 400 });
    }

    let user_id = searchValue.trim().replace(/^[A-Za-z]+/i, '');
    if (searchType === 'mobile') {
      user_id = user_id.replace(/^0/, '');
    }

    const upstreamType = TYPE_MAP[searchType] ?? 'user_id';

    const form = new FormData();
    form.append('user_id', user_id);
    form.append('type',    upstreamType);

    const response = await axios.post(
      'https://admin.skilllift.lk/api/user/',
      form,
      {
        headers: { 'access_token': ACCESS_TOKEN },
        timeout: 10000,
      }
    );

    const data = response.data;
    const p = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;

    if (!p || typeof p !== 'object' || !p.payid) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const get = (...keys: string[]) => {
      for (const k of keys) {
        const v = p[k];
        if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
      }
      return '';
    };

    const firstname = get('firstname');
    const lastname  = get('lastname');
    const fullName  = firstname && lastname ? `${firstname} ${lastname}` : get('name', 'full_name');

    return NextResponse.json({
      payId:        get('payid'),
      srNumber:     get('username') || searchValue,
      name:         fullName,
      firstname,
      lastname,
      email:        get('email'),
      contact:      get('mobile'),
      nic:          get('nic'),
      dob:          get('dob'),
      gender:       get('gender'),
      programme:    get('marketplace'),
      subscription: get('subscription'),
      medium:       get('medium'),
      classFormat:  get('class_format'),
      classType:    get('class_type'),
      team:         get('team'),
    });

  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: unknown }; message?: string };
    const upstream = e?.response?.data as Record<string, unknown> | string | undefined;
    const msg: string =
      typeof upstream === 'string'
        ? upstream
        : typeof upstream?.error === 'string'
          ? upstream.error
          : e?.message ?? 'Unknown error';

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status ?? 500 }
    );
  }
}
